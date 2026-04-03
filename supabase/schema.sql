-- Enable pgvector
create extension if not exists vector with schema extensions;

-- Sources table: tracks uploaded documents
create table sources (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  source_type text not null check (source_type in ('pdf', 'excel', 'email')),
  file_size integer,
  uploaded_at timestamptz default now(),
  metadata jsonb default '{}'
);

-- Documents table: stores chunks with embeddings
create table documents (
  id bigint primary key generated always as identity,
  source_id uuid references sources(id) on delete cascade,
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}',
  created_at timestamptz default now()
);

-- HNSW index for fast cosine similarity search
create index on documents using hnsw (embedding vector_cosine_ops);

-- RPC function for similarity search
create or replace function match_documents(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  source_id uuid,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    documents.source_id,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
