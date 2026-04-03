import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // Fetch source details to get the filename
    const { data: source, error: sourceError } = await getSupabase()
      .from('sources')
      .select('filename, source_type')
      .eq('id', id)
      .single();

    if (sourceError || !source) {
      return new NextResponse('Source not found', { status: 404 });
    }

    // Fetch chunks in order
    const { data: chunks, error: chunkError } = await getSupabase()
      .from('documents')
      .select('content')
      .eq('source_id', id)
      .order('id', { ascending: true });

    if (chunkError) {
      return new NextResponse('Failed to fetch chunks', { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      return new NextResponse('No content available for this document', { status: 404 });
    }

    const fullText = chunks.map(c => c.content).join('\n\n');

    return new NextResponse(fullText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${source.filename}.txt"`
      }
    });

  } catch (err) {
    return new NextResponse('Error generating transcript', { status: 500 });
  }
}
