-- Event System — Phase 2 schema
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Untitled event',
  state      jsonb not null,
  status     text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on every write (used for "load latest active" and archive ordering).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Row-Level Security — "open for now": anyone with the publishable key can read/write.
-- NOTE: this means anyone with the site URL can edit or delete event data.
-- Tighten this (add real auth) before promoting the app widely.
alter table public.events enable row level security;

drop policy if exists "open_all" on public.events;
create policy "open_all" on public.events
  for all
  to anon, authenticated
  using (true)
  with check (true);

create index if not exists events_status_updated_idx
  on public.events (status, updated_at desc);
