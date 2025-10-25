-- Day 7 SDK Events Schema
-- Create sdk_events table for partner SDK event logging
create table if not exists public.sdk_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  generator_id text not null,
  model text not null,
  prompt_hash text not null,
  track_id uuid references public.tracks(id) on delete set null,
  start_ms integer,
  end_ms integer,
  strength real,
  session_id text not null,
  event_type text not null check (event_type in ('session_start', 'use_event', 'session_end'))
);

-- Indexes for performance
create index if not exists idx_sdk_events_session_id on public.sdk_events(session_id);
create index if not exists idx_sdk_events_generator_id on public.sdk_events(generator_id);
create index if not exists idx_sdk_events_created_at on public.sdk_events(created_at);
create index if not exists idx_sdk_events_track_id on public.sdk_events(track_id);

-- Enable RLS
alter table public.sdk_events enable row level security;

-- RLS policy for SDK events (allow inserts with API key validation)
create policy "Allow SDK event inserts" on public.sdk_events
  for insert with check (true); -- API key validation handled in API route

-- Allow reads for authenticated users (for debugging)
create policy "Allow authenticated reads" on public.sdk_events
  for select using (auth.role() = 'authenticated');
