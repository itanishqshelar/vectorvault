-- Drop the existing constraint
alter table public.sources drop constraint if exists sources_source_type_check;

-- Add the new constraint including 'image'
alter table public.sources add constraint sources_source_type_check check (source_type in ('pdf', 'excel', 'email', 'gmail', 'drive', 'image'));

-- Create the 'documents' storage bucket to store files and images (if it doesn't exist)
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false)
on conflict (id) do nothing;
