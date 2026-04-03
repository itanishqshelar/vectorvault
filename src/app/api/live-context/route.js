import { generateEmbedding } from '@/lib/gemini';
import { searchDocuments, getSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { query } = await request.json();

    // If no query provided, fetch recent/general context from all documents
    const searchQuery = query || 'general overview summary';
    const queryEmbedding = await generateEmbedding(searchQuery);
    const results = await searchDocuments(queryEmbedding, 0.2, 15);

    if (!results || results.length === 0) {
      return Response.json({ context: '', chunks: [] });
    }

    // Enrich chunks with source info
    const sourceIds = [...new Set(results.map((r) => r.source_id))];
    const { data: sources } = await getSupabase()
      .from('sources')
      .select('*')
      .in('id', sourceIds);

    const sourceMap = Object.fromEntries((sources || []).map((s) => [s.id, s]));

    const enrichedChunks = results.map((r) => ({
      content: r.content,
      similarity: r.similarity,
      metadata: {
        ...r.metadata,
        filename: sourceMap[r.source_id]?.filename || 'Unknown',
        source_type: sourceMap[r.source_id]?.source_type || 'unknown',
      },
    }));

    const contextText = enrichedChunks
      .map(
        (chunk, i) =>
          `[Source ${i + 1}: ${chunk.metadata?.filename || 'Unknown'} | Type: ${chunk.metadata?.source_type || 'unknown'}]\n${chunk.content}`
      )
      .join('\n\n---\n\n');

    return Response.json({ context: contextText, chunks: enrichedChunks });
  } catch (error) {
    console.error('Live context error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch context' },
      { status: 500 }
    );
  }
}
