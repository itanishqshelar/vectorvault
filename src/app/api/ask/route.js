import { generateEmbedding, askWithContext } from '@/lib/gemini';
import { searchDocuments, getSupabase } from '@/lib/supabase';
import { SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(request) {
  try {
    const { query, attachments = [] } = await request.json();

    const actualQuery = query || (attachments.length > 0 ? "Please analyze the attached file(s)." : "");

    if (!actualQuery || actualQuery.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No query provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let results = [];
    if (query?.trim()?.length > 0) {
      // Embed the original query
      const queryEmbedding = await generateEmbedding(query);

      // Search for relevant chunks
      results = await searchDocuments(queryEmbedding, 0.3, 10);
    }

    if ((!results || results.length === 0) && attachments.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "I couldn't find any relevant information in the uploaded documents to answer your question.",
          sources: [],
          conflict_detected: false,
          conflict_details: null,
          reasoning: 'No matching documents found in the knowledge base.',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
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
        uploaded_at: sourceMap[r.source_id]?.uploaded_at,
        source_id: r.source_id,
      },
    }));

    // Stream response from Gemini
    const stream = await askWithContext(actualQuery, enrichedChunks, SYSTEM_PROMPT, attachments);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text || '';
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Ask error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Query failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
