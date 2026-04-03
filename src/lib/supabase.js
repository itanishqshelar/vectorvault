import { createClient } from '@supabase/supabase-js';

let _supabase;

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase environment variables');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export async function insertDocuments(sourceId, chunks) {
  const rows = chunks.map((chunk) => ({
    source_id: sourceId,
    content: chunk.content,
    embedding: chunk.embedding,
    metadata: chunk.metadata,
  }));

  const { data, error } = await getSupabase()
    .from('documents')
    .insert(rows)
    .select('id');

  if (error) throw error;
  return data;
}

export async function searchDocuments(queryEmbedding, threshold = 0.5, limit = 10) {
  const { data, error } = await getSupabase().rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) throw error;
  return data;
}

export async function createSource({ filename, sourceType, fileSize, metadata = {} }) {
  const { data, error } = await getSupabase()
    .from('sources')
    .insert({ filename, source_type: sourceType, file_size: fileSize, metadata })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSources() {
  const { data, error } = await getSupabase()
    .from('sources')
    .select('*, documents(count)')
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data.map((s) => ({
    ...s,
    chunk_count: s.documents?.[0]?.count ?? 0,
  }));
}

export async function deleteSource(id) {
  const { error } = await getSupabase().from('sources').delete().eq('id', id);
  if (error) throw error;
}
