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

-- Row-Level Security — Phase 3: everyone can read, only the signed-in
-- organizer can write. Exactly one Supabase Auth user should ever exist
-- (create it manually in the dashboard and disable public sign-ups), so
-- "authenticated" and "the organizer" are equivalent — no admin table needed.
alter table public.events enable row level security;

-- Superseded by the read/write split below; drop it if it exists from Phase 2.
drop policy if exists "open_all" on public.events;

drop policy if exists "public_read" on public.events;
create policy "public_read" on public.events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "admin_insert" on public.events;
create policy "admin_insert" on public.events
  for insert
  to authenticated
  with check (true);

drop policy if exists "admin_update" on public.events;
create policy "admin_update" on public.events
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "admin_delete" on public.events;
create policy "admin_delete" on public.events
  for delete
  to authenticated
  using (true);

create index if not exists events_status_updated_idx
  on public.events (status, updated_at desc);
