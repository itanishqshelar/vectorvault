import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { getOAuthClientWithTokens } from '@/lib/googleAuth';
import { parseGmailMessage } from '@/lib/parsers/gmail';
import { chunkText } from '@/lib/chunker';
import { generateEmbeddings } from '@/lib/gemini';
import { createSource, insertDocuments, sourceExistsByExternalId, uploadSourceFile, updateSourceStoragePath } from '@/lib/supabase';

export async function POST(request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('google_tokens');
  if (!tokenCookie?.value) {
    return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
  }

  const tokens = JSON.parse(tokenCookie.value);
  const { auth, getUpdatedTokens } = getOAuthClientWithTokens(tokens);
  const gmail = google.gmail({ version: 'v1', auth });

  const body = await request.json().catch(() => ({}));
  const maxMessages = Math.min(Number(body.maxMessages) || 20, 100);
  const query = body.query || '';

  let synced = 0;
  let skipped = 0;
  const errors = [];

  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxMessages,
      ...(query ? { q: query } : {}),
    });

    const messages = listRes.data.messages || [];
    const total = messages.length;

    for (const { id } of messages) {
      const externalId = `gmail:${id}`;
      try {
        const exists = await sourceExistsByExternalId(externalId);
        if (exists) {
          skipped++;
          continue;
        }

        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',
        });

        const parsed = parseGmailMessage(msgRes.data);
        if (!parsed.text || parsed.text.trim().length === 0) {
          skipped++;
          continue;
        }

        const source = await createSource({
          filename: parsed.metadata.filename,
          sourceType: 'gmail',
          fileSize: Buffer.byteLength(parsed.text, 'utf-8'),
          metadata: parsed.metadata,
          externalId,
        });

        const transcriptBuffer = Buffer.from(parsed.text, 'utf-8');
        const storagePath = await uploadSourceFile(source.id, `${parsed.metadata.filename}.txt`, transcriptBuffer, 'text/plain');
        await updateSourceStoragePath(source.id, storagePath);

        const chunks = chunkText(parsed.text, {
          source_type: 'gmail',
          filename: parsed.metadata.filename,
          ...parsed.metadata,
        });

        const embeddings = await generateEmbeddings(chunks.map((c) => c.content));
        const chunksWithEmbeddings = chunks.map((chunk, i) => ({
          ...chunk,
          embedding: embeddings[i],
        }));

        await insertDocuments(source.id, chunksWithEmbeddings);
        synced++;
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    const response = NextResponse.json({
      synced,
      skipped,
      total,
      ...(errors.length > 0 ? { errors } : {}),
    });

    // Persist refreshed tokens if they were updated
    const refreshed = getUpdatedTokens();
    if (refreshed) {
      response.cookies.set('google_tokens', JSON.stringify(refreshed), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err) {
    console.error('Gmail fetch error:', err);
    return NextResponse.json({ error: err.message || 'Gmail sync failed' }, { status: 500 });
  }
}
