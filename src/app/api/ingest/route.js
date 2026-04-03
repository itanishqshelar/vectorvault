import { NextResponse } from 'next/server';
export const maxDuration = 60;

import {
  createSource,
  uploadSourceFile,
  updateSourceStoragePath,
} from '@/lib/supabase';

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

    // Create source record — store status in metadata (no schema migration needed)
    const source = await createSource({
      filename,
      sourceType,
      fileSize: buffer.length,
      metadata: { status: 'uploading' },
    });

    // Upload original file to Supabase Storage
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const storagePath = await uploadSourceFile(source.id, filename, buffer, mimeType);
    await updateSourceStoragePath(source.id, storagePath);

    // Return immediately — frontend will call /api/ingest/process next
    return NextResponse.json({
      source_id: source.id,
      filename,
      source_type: sourceType,
      status: 'uploaded',
    });
  } catch (error) {
    console.error('Ingest upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
