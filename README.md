# Event System

Tournament pairing/bracket engine for a TCG store platform. See
[PLAN.md](./PLAN.md) for roadmap and architecture decisions.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run test     # run engine tests (vitest)
npm run build    # production build
```

## Structure

```
src/
  engine/
    tournament.js        # pure Swiss + bracket logic, no React dependency
    tournament.test.js    # vitest suite
  components/
    PairingTicket.jsx
    StandingsTable.jsx
    BracketView.jsx
  App.jsx                 # wires engine to UI
  styles/tokens.css
```
