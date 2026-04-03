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

export async function createSource({ filename, sourceType, fileSize, metadata = {}, externalId = null }) {
  const payload = { filename, source_type: sourceType, file_size: fileSize, metadata };
  if (externalId) {
    payload.external_id = externalId;
  }

  const { data, error } = await getSupabase()
    .from('sources')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sourceExistsByExternalId(externalId) {
  const { data, error } = await getSupabase()
    .from('sources')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
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
  // Also remove the stored file from storage if it exists
  const { data: source } = await getSupabase()
    .from('sources')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (source?.storage_path) {
    await getSupabase().storage.from('documents').remove([source.storage_path]);
  }

  const { error } = await getSupabase().from('sources').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadSourceFile(sourceId, filename, buffer, mimeType) {
  const supabase = getSupabase();
  const BUCKET = 'documents';

  // Create bucket if it doesn't exist yet
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) {
    throw new Error(`Storage bucket error: ${bucketError.message}`);
  }

  const path = `${sourceId}/${filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Storage upload error: ${error.message}`);
  return path;
}

export async function updateSourceStoragePath(sourceId, storagePath) {
  const { error } = await getSupabase()
    .from('sources')
    .update({ storage_path: storagePath })
    .eq('id', sourceId);
  if (error) throw error;
}

export async function getSourceFileSignedUrl(sourceId) {
  const { data: source, error: fetchError } = await getSupabase()
    .from('sources')
    .select('storage_path')
    .eq('id', sourceId)
    .single();

  if (fetchError) throw fetchError;
  if (!source?.storage_path) throw new Error('No file stored for this document');

  const { data, error } = await getSupabase().storage
    .from('documents')
    .createSignedUrl(source.storage_path, 3600); // 1-hour expiry

  if (error) throw error;
  return data.signedUrl;
}
