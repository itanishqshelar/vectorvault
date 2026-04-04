import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { getOAuthClientWithTokens } from '@/lib/googleAuth';
import { parsePDF } from '@/lib/parsers/pdf';
import { parseExcel } from '@/lib/parsers/excel';
import { chunkText } from '@/lib/chunker';
import { generateEmbeddings } from '@/lib/gemini';
import { createSource, insertDocuments, sourceExistsByExternalId } from '@/lib/supabase';

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
];

async function downloadFile(drive, file) {
  const { id, mimeType, name } = file;

  if (mimeType === 'application/vnd.google-apps.document') {
    const res = await drive.files.export(
      { fileId: id, mimeType: 'text/plain' },
      { responseType: 'arraybuffer' }
    );
    const text = Buffer.from(res.data).toString('utf-8');
    return { buffer: null, text, sourceType: 'drive' };
  }

  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const res = await drive.files.export(
      {
        fileId: id,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(res.data);
    const parsed = parseExcel(buffer, name);
    return { buffer, text: parsed.text, metadata: parsed.metadata, sourceType: 'drive' };
  }

  const res = await drive.files.get(
    { fileId: id, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(res.data);

  if (mimeType === 'application/pdf') {
    const parsed = await parsePDF(buffer, name);
    return { buffer, text: parsed.text, metadata: parsed.metadata, sourceType: 'drive' };
  }

  const parsed = parseExcel(buffer, name);
  return { buffer, text: parsed.text, metadata: parsed.metadata, sourceType: 'drive' };
}

function setTokenCookie(response, tokens) {
  response.cookies.set('google_tokens', JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function syncFiles(drive, files) {
  let synced = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    const externalId = `drive:${file.id}`;
    try {
      const exists = await sourceExistsByExternalId(externalId);
      if (exists) {
        skipped++;
        continue;
      }

      const { text, metadata: parsedMeta, sourceType } = await downloadFile(drive, file);

      if (!text || text.trim().length === 0) {
        skipped++;
        continue;
      }

      const fileSize = file.size ? parseInt(file.size) : Buffer.byteLength(text, 'utf-8');

      const source = await createSource({
        filename: file.name,
        sourceType,
        fileSize,
        metadata: {
          ...(parsedMeta || {}),
          source_type: 'drive',
          filename: file.name,
          drive_file_id: file.id,
          drive_modified: file.modifiedTime,
        },
        externalId,
      });

      const chunks = chunkText(text, {
        source_type: 'drive',
        filename: file.name,
        drive_file_id: file.id,
      });

      const embeddings = await generateEmbeddings(chunks.map((c) => c.content));
      const chunksWithEmbeddings = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i],
      }));

      await insertDocuments(source.id, chunksWithEmbeddings);
      synced++;
    } catch (err) {
      errors.push({ id: file.id, name: file.name, error: err.message });
    }
  }

  return { synced, skipped, total: files.length, errors };
}

// GET /api/fetch/drive?folderId=...&maxFiles=...
// Lists Drive files so the user can manually select which to import.
export async function GET(request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('google_tokens');
  if (!tokenCookie?.value) {
    return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
  }

  const tokens = JSON.parse(tokenCookie.value);
  const { auth, getUpdatedTokens } = getOAuthClientWithTokens(tokens);
  const drive = google.drive({ version: 'v3', auth });

  const { searchParams } = new URL(request.url);
  const maxFiles = Math.min(Number(searchParams.get('maxFiles')) || 50, 100);
  const folderId = searchParams.get('folderId') || null;

  const mimeQuery = SUPPORTED_MIME_TYPES.map((m) => `mimeType='${m}'`).join(' or ');
  const folderFilter = folderId ? ` and '${folderId}' in parents` : '';
  const q = `(${mimeQuery}) and trashed=false${folderFilter}`;

  try {
    const listRes = await drive.files.list({
      q,
      pageSize: maxFiles,
      fields: 'files(id,name,mimeType,size,modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    const files = listRes.data.files || [];

    // Batch-check which files are already synced
    const { getSupabase } = await import('@/lib/supabase');
    const externalIds = files.map((f) => `drive:${f.id}`);
    const { data: existingRows } = await getSupabase()
      .from('sources')
      .select('external_id')
      .in('external_id', externalIds);
    const syncedSet = new Set((existingRows || []).map((r) => r.external_id));

    const filesWithStatus = files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size || null,
      modifiedTime: f.modifiedTime,
      alreadySynced: syncedSet.has(`drive:${f.id}`),
    }));

    const response = NextResponse.json({ files: filesWithStatus });
    const refreshed = getUpdatedTokens();
    if (refreshed) setTokenCookie(response, refreshed);
    return response;
  } catch (err) {
    console.error('Drive list error:', err);
    return NextResponse.json({ error: err.message || 'Drive list failed' }, { status: 500 });
  }
}

export async function POST(request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('google_tokens');
  if (!tokenCookie?.value) {
    return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
  }

  const tokens = JSON.parse(tokenCookie.value);
  const { auth, getUpdatedTokens } = getOAuthClientWithTokens(tokens);
  const drive = google.drive({ version: 'v3', auth });

  const body = await request.json().catch(() => ({}));

  let files;

  if (Array.isArray(body.fileIds) && body.fileIds.length > 0) {
    // Manual selection: fetch metadata for the specific file IDs
    const fileRequests = body.fileIds.map((id) =>
      drive.files
        .get({ fileId: id, fields: 'id,name,mimeType,size,modifiedTime' })
        .then((r) => r.data)
        .catch(() => null)
    );
    files = (await Promise.all(fileRequests)).filter(Boolean);
  } else {
    // Auto-sync mode: list files by folder/max
    const maxFiles = Math.min(Number(body.maxFiles) || 20, 100);
    const folderId = body.folderId || null;
    const mimeQuery = SUPPORTED_MIME_TYPES.map((m) => `mimeType='${m}'`).join(' or ');
    const folderFilter = folderId ? ` and '${folderId}' in parents` : '';
    const q = `(${mimeQuery}) and trashed=false${folderFilter}`;

    const listRes = await drive.files.list({
      q,
      pageSize: maxFiles,
      fields: 'files(id,name,mimeType,size,modifiedTime)',
      orderBy: 'modifiedTime desc',
    });
    files = listRes.data.files || [];
  }

  try {
    const { synced, skipped, total, errors } = await syncFiles(drive, files);

    const response = NextResponse.json({
      synced,
      skipped,
      total,
      ...(errors.length > 0 ? { errors } : {}),
    });

    const refreshed = getUpdatedTokens();
    if (refreshed) setTokenCookie(response, refreshed);
    return response;
  } catch (err) {
    console.error('Drive fetch error:', err);
    return NextResponse.json({ error: err.message || 'Drive sync failed' }, { status: 500 });
  }
}
