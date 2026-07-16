# Event System

Tournament pairing/bracket engine for a TCG store platform. See
[PLAN.md](./PLAN.md) for roadmap and architecture decisions.

## Getting started

```bash
npm install
npm run dev        # start dev server
npm run test       # run engine tests (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build
```

## Persistence (Supabase)

Event state is persisted to Supabase (Postgres). To run the app you need a
Supabase project and two env vars.

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in your **Project URL** and
   **publishable** key (Project Settings → API):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. Run [`supabase/schema.sql`](./supabase/schema.sql) once in the Supabase
   SQL editor to create the `events` table.

**Deploy (Vercel):** import the repo and set the same two env vars in the
Vercel project settings.

> Auth is intentionally **open** right now (permissive RLS) — anyone with the
> URL can edit. See [PLAN.md](./PLAN.md) for the Phase 2 TODOs, including
> archive support for elimination-format events.

## Structure

```
src/
  engine/
    tournament.ts         # pure Swiss + bracket logic + domain types, no React dependency
    tournament.test.ts    # vitest suite
  components/
    PairingTicket.tsx
    StandingsTable.tsx
    BracketView.tsx
  lib/
    supabase.ts           # Supabase client (reads env vars)
    eventStore.ts         # load / save / archive events + persisted state types
  App.tsx                 # wires engine to UI + persistence
  styles/tokens.css
supabase/
  schema.sql              # run once to create the events table
```
