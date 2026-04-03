import { generateEmbedding } from '@/lib/gemini';
import { searchDocuments, getSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const queryEmbedding = await generateEmbedding(query);
    const raw = await searchDocuments(queryEmbedding, 0.25, 12);

    if (!raw || raw.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sourceIds = [...new Set(raw.map((r) => r.source_id))];
    const { data: sources } = await getSupabase()
      .from('sources')
      .select('id, filename, source_type')
      .in('id', sourceIds);

    const sourceMap = Object.fromEntries((sources || []).map((s) => [s.id, s]));

    const results = raw.map((r) => ({
      id: r.id,
      source_id: r.source_id,
      filename: sourceMap[r.source_id]?.filename || 'Unknown',
      source_type: sourceMap[r.source_id]?.source_type || 'unknown',
      content: r.content,
      similarity: r.similarity,
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
