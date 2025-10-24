-- sdk_logs table required by PRD
create table if not exists public.sdk_logs (
  id uuid primary key default gen_random_uuid(),
  partner_id text,
  track_id uuid references public.tracks(id) on delete set null,
  model text,
  event text check (event in ('begin','end','reference')) default 'reference',
  payload jsonb not null default '{}',
  created_at timestamp with time zone default now()
);

-- royalty_events must reference track_id per PRD
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'royalty_events' and column_name = 'result_id'
  ) then
    alter table public.royalty_events drop column result_id;
  end if;
exception when undefined_table then
  null;
end $$;

alter table if exists public.royalty_events
  add column if not exists track_id uuid references public.tracks(id) on delete cascade;

-- optional helper indexes
create index if not exists idx_sdk_logs_track_id on public.sdk_logs(track_id);
create index if not exists idx_royalty_events_track_id on public.royalty_events(track_id);
