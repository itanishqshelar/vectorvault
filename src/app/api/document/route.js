import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');

    if (!sourceId) {
      return new Response(JSON.stringify({ error: 'Missing source ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    // Fetch source details
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return new Response(JSON.stringify({ error: 'Source not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all document chunks for this source
    // Ordering by id assumes chunks were inserted sequentially
    const { data: chunks, error: chunksError } = await supabase
      .from('documents')
      .select('id, content, metadata')
      .eq('source_id', sourceId)
      .order('id', { ascending: true });

    if (chunksError) {
      throw chunksError;
    }

    return new Response(JSON.stringify({ source, chunks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fetch document error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
