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

See [PLAN.md](./PLAN.md) for the Phase 2 TODOs, including archive support for
elimination-format events.

## Organizer sign-in (Supabase Auth)

Everyone can view the current event; only a signed-in organizer can edit it
(report results, start rounds, manage the roster, archive events). There's
exactly **one shared admin account**, created directly in the Supabase
dashboard — there's no self-serve sign-up.

1. In the Supabase dashboard: **Authentication → Users → Add user**. Enter
   the organizer's email + a password, and check **Auto Confirm User**.
2. **Authentication → Providers → Email**: turn off **Allow new users to
   sign up**. This is what makes it a *single* admin account — no one else
   can ever create one, regardless of the (public) publishable key being in
   the browser bundle.
3. In the app, click **Organizer sign in** (top right) and sign in with that
   email + password.

Protection is enforced in Postgres (RLS), not just hidden in the UI — see
`supabase/schema.sql`.

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
    AdminLogin.tsx         # organizer sign-in popup + signed-in badge
  lib/
    supabase.ts           # Supabase client (reads env vars)
    eventStore.ts         # load / save / archive events + persisted state types
    auth.ts               # sign in / out, session helpers
  App.tsx                 # wires engine to UI + persistence + auth-gated editing
  styles/tokens.css
supabase/
  schema.sql              # run once to create the events table
```
