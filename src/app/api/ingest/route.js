import { NextResponse } from 'next/server';
export const maxDuration = 60; // Allow more time for processing PDFs on Vercel
import { parsePDF } from '@/lib/parsers/pdf';
import { parseExcel } from '@/lib/parsers/excel';
import { parseEmail } from '@/lib/parsers/email';
import { parseImage } from '@/lib/parsers/image';
import { chunkText } from '@/lib/chunker';
import { generateEmbeddings } from '@/lib/gemini';
import { createSource, insertDocuments, uploadSourceFile, updateSourceStoragePath } from '@/lib/supabase';

const PARSERS = {
  pdf: parsePDF,
  xlsx: parseExcel,
  xls: parseExcel,
  eml: parseEmail,
  png: parseImage,
  jpg: parseImage,
  jpeg: parseImage,
};

const MIME_TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  eml: 'message/rfc822',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'eml') return 'email';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image';
  return null;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name;
    const ext = filename.split('.').pop().toLowerCase();
    const sourceType = getFileType(filename);

    if (!sourceType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported: PDF, XLSX, XLS, EML, PNG, JPG' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse the file
    const parser = PARSERS[ext];
    const parsed = await parser(buffer, filename);

    if (!parsed.text || parsed.text.trim().length === 0) {
      return NextResponse.json({ error: 'No text content extracted from file' }, { status: 400 });
    }

    // Create source record
    const source = await createSource({
      filename,
      sourceType,
      fileSize: buffer.length,
      metadata: parsed.metadata,
    });

    // Chunk the text
    const chunks = chunkText(parsed.text, {
      source_type: sourceType,
      filename,
      ...parsed.metadata,
    });

    // Generate embeddings for all chunks
    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    // Attach embeddings to chunks
    const chunksWithEmbeddings = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));

    // Insert into Supabase
    await insertDocuments(source.id, chunksWithEmbeddings);

    // Upload original file to Supabase Storage
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const storagePath = await uploadSourceFile(source.id, filename, buffer, mimeType);
    await updateSourceStoragePath(source.id, storagePath);

    return NextResponse.json({
      source_id: source.id,
      filename,
      source_type: sourceType,
      chunks_count: chunks.length,
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message || 'Ingestion failed' }, { status: 500 });
  }
}
