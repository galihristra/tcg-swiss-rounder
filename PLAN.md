# Event System — Plan

Tournament event system for a TCG store platform (companion to a separate
"Card System" for inventory/auction). This piece owns **event creation,
registration, pairings/brackets, and standings**.

## Status: engine done, verified, and building

- `src/engine/tournament.js` — pure functions, no React/DOM dependency.
  Swiss pairing + standings (MTG-style tiebreakers), single elimination
  (standard seeding), double elimination (winners/losers bracket + grand
  final reset).
- `src/engine/tournament.test.js` — 20 Vitest cases (randomized results,
  sizes 2–16, odd player counts, byes). All passing.
- `src/App.jsx` + `src/components/*` — working reference UI: add/remove
  players, run Swiss rounds and report results, generate & play out
  single/double elim brackets. Runs and builds clean (`npm run dev` /
  `npm run build` both verified).

Known, intentional simplifications (see comments at the top of
`tournament.js`):
1. Swiss pairing is greedy nearest-neighbor by standing, not the full
   Dutch/USCF algorithm — fine below ~64 players, could in rare cases
   force one avoidable rematch.
2. Losers-bracket pairings in double elim are positional, not seeded to
   maximally delay rematches. Elimination logic itself (lose twice = out,
   bracket reset) is correct and tested.

Revisit these only if this needs to satisfy a formal ruleset (e.g. WER/DCI
rules for sanctioned play) — flag it before then.

## Architecture decisions already made

- **Vite + React**, plain JS (no TypeScript) — matches the rest of the
  stack (React Native, Nuxt).
- Engine is framework-agnostic on purpose — same functions should be
  reusable from a React Native "run the floor" companion app later without
  rewriting pairing logic.
- No backend yet. Everything today is in-memory React state. That's the
  next real decision point (see Phase 2).

## Roadmap

### Phase 1 — Registration & check-in (next)
- Event model: name, format, game, round count, capacity, entry fee.
- Player registration flow (self-serve link vs. organizer-entered).
- Check-in: roster confirmed present before round 1 pairs; drop/no-show
  handling mid-event (the engine already supports `player.dropped`).
- Decklist submission if the format requires it (optional per event).

### Phase 2 — Persistence
- Decide: REST API against a real DB, or start with `localStorage` +
  swap later? Given this needs to survive a organizer's browser refresh
  mid-event at minimum, don't ship Phase 1 without at least local
  persistence.
- If a backend is in scope now: pick storage for events/players/matches,
  and where auth lives (does this share a login with the Card System's
  existing login, or is it separate?).

### Phase 3 — Live/shared views
- Player-facing "what table am I at" / standings view that updates
  without the organizer manually refreshing (polling is fine to start;
  websockets only if it's justified).
- Multi-organizer / judge support: who can report results.

### Phase 4 — Polish
- Print/export pairings and standings (many stores still post a paper
  sheet at the table).
- Tiebreaker display detail — show the breakdown, not just the number,
  so a player can see *why* they placed where they did.

## Immediate next steps for this session

1. `npm install`, `npm run test`, `npm run dev` — confirm still green
   after pulling this into your own environment.
2. Decide Phase 2's persistence approach before building Phase 1 UI on
   top of it — registration/check-in state needs somewhere to live.
3. Open questions to resolve before Phase 1: single event at a time, or
   multi-event dashboard? Does registration need payment (ties back to
   the auction/inventory side of the platform), or is that out of scope
   for v1?

## Git workflow

Repo is initialized with an initial commit containing everything above.
Suggested from here: feature branches per phase (`feature/registration`,
`feature/persistence`, ...), conventional commits, PR back to `main` per
phase rather than one long-running branch.
