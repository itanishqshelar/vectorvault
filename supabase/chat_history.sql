-- Chat sessions table
create table chat_sessions (
  id text primary key,
  title text not null default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat messages table
create table chat_messages (
  id bigint primary key generated always as identity,
  session_id text references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  parsed jsonb,
  created_at timestamptz default now()
);

-- Index for fast message lookup by session
create index idx_chat_messages_session on chat_messages(session_id, created_at);

-- Index for listing sessions by recency
create index idx_chat_sessions_updated on chat_sessions(updated_at desc);

-- Auto-update updated_at on chat_sessions when messages are inserted
create or replace function update_session_timestamp()
returns trigger as $$
begin
  update chat_sessions set updated_at = now() where id = NEW.session_id;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_update_session_timestamp
after insert on chat_messages
for each row execute function update_session_timestamp();
