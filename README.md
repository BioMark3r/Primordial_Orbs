# Primordial Orbs — Browser Prototype (Local 2 Player)

Primordial Orbs is a two‑player competitive strategy game where players act as terraformers,
building planets while destabilizing their opponent through catastrophic events.

This repository contains a **browser‑based Local 2 Player MVP**, built with **Vite + React + TypeScript**.

---

## Requirements

- Node.js **18+** recommended
- npm (comes with Node)

---

## Installation & Run

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal (usually http://localhost:5173).

---

## Game Flow (Browser)

1. **Title Screen**
   - Select *Local 2 Player*

2. **Setup Screen**
   - Choose a Planet Core for Player 0 and Player 1
   - Start Game

3. **Gameplay Loop**
   - **DRAW phase**: Click *Draw 2*
   - **PLAY phase**:
     - Click a Terraform or Colonize orb, then click a slot to place it
     - Click an Impact orb to automatically target the opponent
     - Maximum per turn:
       - 2 total plays
       - 1 impact
   - **END PLAY**
   - **ADVANCE** to resolve effects and pass turn

4. **Win Condition**
   - First player to achieve **4 different Colonization types** wins

---

## Notes

- Planet size is fixed to **Medium (6 slots)** in this MVP
- Core passives are displayed but not yet mechanically enforced
- Impact resolution is deterministic (no physics yet)
- Solo and AI files are included for future expansion but not wired

---

## Folder Structure

```
src/
  engine/      // Game rules & logic
  App.tsx      // UI + setup flow
  main.tsx     // React entry
```

---

## Next Recommended Steps

- Wire Core passives into the engine
- Add planet size selection
- Add Solo: Entropy mode
- Replace click‑to‑play with drag‑and‑drop
