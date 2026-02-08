# Primordial Orbs — Local 2P (Browser MVP)

This is a playable Local 2-player prototype of **Primordial Orbs**, built with **Vite + React + TypeScript**.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (commonly http://localhost:5173).

## How to Play (MVP)

1. **Title → Setup**
   - Choose Player 0 and Player 1 planet cores.
   - Click **Start Game**.

2. **Turn Loop**
   - **DRAW**: Click **Draw 2**.
     - If your hand exceeds 3, discard down to 3.
   - **PLAY**: You have **2 plays** and **1 impact** max per turn.
     - Terraform / Colonize: click a hand orb, then click a slot to place.
     - Impact: click an Impact orb (auto-targets opponent).
     - Core actions:
       - **Water**: with no hand selected, click two Terraform slots to swap (once/turn).
       - **Gas**: **Shift-click** a hand orb to discard+draw (once/turn).
   - **End Play**
   - **Advance** (Resolve → Check Win → next player)

3. **Win**
   - First player to have **4 different colonization types** (Plant, Animal, Sentient, High-Tech) wins.

## Core Passives (Wired)

- **Land**: First Terraform each turn is free (does not consume a play).  
  Weakness: Terraform-destroying impacts remove +1 Terraform.
- **Water**: Once per turn, swap two Terraform slots.  
  Weakness: Disease impacts have +1 severity.
- **Ice**: First impact against you each turn has -1 severity (min 1).  
  Weakness: On an Ice-core planet, placing Lava melts one Ice terraform.
- **Lava**: Your impacts have +1 severity (if abilities enabled).  
  Weakness: If unstable, you take 2 instability strikes instead of 1.
- **Gas**: Once per turn, Shift-click a hand orb to discard+draw.  
  Weakness: Cannot place Ice terraform.

## Notes

- **Temporal Vortex** is implemented: it rewinds the target planet by **one recorded step** (the most recent planet change).


- Planet size is fixed to **Medium (6 slots)** for MVP.
- Impacts are deterministic (no physics arena yet).
- Solo/AI files are included for future expansion but not wired.
