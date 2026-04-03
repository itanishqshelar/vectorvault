import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Check metadata status
    const { data: source, error } = await getSupabase()
      .from('sources')
      .select('id, filename, metadata')
      .eq('id', id)
      .single();

    if (error || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Also check if documents exist (processing complete)
    const { count } = await getSupabase()
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', id);

    if (count > 0) {
      return NextResponse.json({ status: 'ready', chunks_count: count });
    }

    const metaStatus = source.metadata?.status || 'unknown';
    const errorMessage = source.metadata?.error || null;

    return NextResponse.json({
      status: metaStatus,
      error_message: errorMessage,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }
}
