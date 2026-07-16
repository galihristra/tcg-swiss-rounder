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
  App.tsx                 # wires engine to UI
  styles/tokens.css
```
