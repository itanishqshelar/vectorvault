import { NextResponse } from 'next/server';
export const maxDuration = 60;

import { parsePDF } from '@/lib/parsers/pdf';
import { parseExcel } from '@/lib/parsers/excel';
import { parseEmail } from '@/lib/parsers/email';
import { parseImage } from '@/lib/parsers/image';
import { chunkText } from '@/lib/chunker';
import { generateEmbeddings } from '@/lib/gemini';
import {
  downloadSourceFile,
  insertDocuments,
  getSupabase,
} from '@/lib/supabase';

const PARSERS = {
  pdf: parsePDF,
  xlsx: parseExcel,
  xls: parseExcel,
  eml: parseEmail,
  png: parseImage,
  jpg: parseImage,
  jpeg: parseImage,
};

function getExtFromFilename(filename) {
  return filename.split('.').pop().toLowerCase();
}

async function updateMetadataStatus(sourceId, status, errorMessage = null) {
  const update = errorMessage
    ? { metadata: { status, error: errorMessage } }
    : { metadata: { status } };
  await getSupabase().from('sources').update(update).eq('id', sourceId);
}

export async function POST(request) {
  let sourceId = null;
  try {
    const { source_id } = await request.json();
    sourceId = source_id;

    if (!source_id) {
      return NextResponse.json({ error: 'source_id required' }, { status: 400 });
    }

    const { data: source, error: fetchError } = await getSupabase()
      .from('sources')
      .select('*')
      .eq('id', source_id)
      .single();

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Skip if already processed (has documents)
    const { count } = await getSupabase()
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', source_id);

    if (count > 0) {
      return NextResponse.json({ status: 'ready', chunks_count: count });
    }

    await updateMetadataStatus(source_id, 'processing');

    // Download file from storage
    const buffer = await downloadSourceFile(source.storage_path);
    const ext = getExtFromFilename(source.filename);

    const parser = PARSERS[ext];
    if (!parser) {
      await updateMetadataStatus(source_id, 'error', 'Unsupported file type');
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const parsed = await parser(buffer, source.filename);

    if (!parsed.text || parsed.text.trim().length === 0) {
      await updateMetadataStatus(source_id, 'error', 'No text content extracted');
      return NextResponse.json({ error: 'No text extracted' }, { status: 400 });
    }

    // Chunk
    const chunks = chunkText(parsed.text, {
      source_type: source.source_type,
      filename: source.filename,
      ...parsed.metadata,
    });

    // Embed
    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    const chunksWithEmbeddings = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));

    // Insert
    await insertDocuments(source_id, chunksWithEmbeddings);
    await updateMetadataStatus(source_id, 'ready');

    return NextResponse.json({ status: 'ready', chunks_count: chunks.length });
  } catch (error) {
    console.error('Process error:', error);
    if (sourceId) {
      await updateMetadataStatus(sourceId, 'error', error.message).catch(() => {});
    }
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
