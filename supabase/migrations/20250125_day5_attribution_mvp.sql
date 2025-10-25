-- Day 5 Attribution MVP Schema
-- Create tracks table for audio files and embeddings
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  embedding vector(512), -- Using pgvector for similarity search
  audio_url text not null,
  created_at timestamptz default now()
);

-- Create storage bucket for audio files
insert into storage.buckets (id, name, public)
values ('tracks', 'tracks', false)
on conflict (id) do nothing;

-- Storage policies for tracks bucket
create policy "Users can upload their own tracks" on storage.objects
  for insert with check (
    bucket_id = 'tracks' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own tracks" on storage.objects
  for select using (
    bucket_id = 'tracks' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own tracks" on storage.objects
  for delete using (
    bucket_id = 'tracks' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Index for similarity search
create index if not exists idx_tracks_embedding on public.tracks 
using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Index for user queries
create index if not exists idx_tracks_user_id on public.tracks(user_id);
create index if not exists idx_tracks_created_at on public.tracks(created_at);

-- Enable RLS
alter table public.tracks enable row level security;

-- RLS policies for tracks
create policy "Users can view their own tracks" on public.tracks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tracks" on public.tracks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tracks" on public.tracks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tracks" on public.tracks
  for delete using (auth.uid() = user_id);
