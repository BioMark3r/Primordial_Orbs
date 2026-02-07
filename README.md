# Primordial Orbs — Local 2P (Browser MVP)

This is a minimal, playable Local 2-player prototype of **Primordial Orbs** built with Vite + React + TypeScript.

## Run
```bash
npm install
npm run dev
```

## How to play
1. Title → Setup: choose cores for P0 and P1, then Start.
2. On your turn:
   - **Draw 2** (DRAW phase)
   - In PLAY: click Terraform/Colonize in hand, then click a slot to place.
   - Click an Impact orb to fire at the opponent (default target).
   - **End Play**
   - **Advance** (RESOLVE → CHECK_WIN → next player)

## Notes
- Planet size is fixed to Medium (6 slots) for MVP.
- Core passives are displayed but not yet wired into engine rules (next iteration).
- Deterministic impacts and colonization requirements are implemented.
- Files for Solo/AI are included as placeholders for future wiring.
