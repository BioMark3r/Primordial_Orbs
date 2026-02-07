# Primordial Orbs — Official Rulebook (v1.0)

## 1. Overview

Primordial Orbs is a two‑player strategy game where players terraform planets,
develop life, and unleash disasters to destabilize their opponent.

Players win by successfully guiding life to planetary ascension while preventing
their opponent from doing the same.

---

## 2. Components

- Terraforming Orbs:
  - Land, Water, Ice, Lava, Gas
- Colonization Orbs:
  - Plant, Animal, Sentient, High‑Tech
- Impact Orbs:
  - Meteor
  - Tornado
  - Earthquake
  - Solar Flare
  - Disease
  - Temporal Vortex
  - Black Hole (1 per game)
- Planet Tray (Medium size in MVP: 6 slots)

---

## 3. Planet Rules

- Each planet has a fixed number of slots
- At least **50% of slots must contain Terraforming orbs**
- If a planet drops below this minimum, it gains an **Instability Strike**
- Two Instability Strikes result in planetary collapse (loss)

---

## 4. Planet Cores

Each player selects a Planet Core:
- Land
- Water
- Ice
- Lava
- Gas

Cores define thematic strengths and weaknesses.
(Core abilities are displayed in the UI; full effects are implemented in later versions.)

---

## 5. Setup

1. Each player chooses a Planet Core
2. Place one Terraforming orb of that type in the first slot
3. Shuffle all remaining orbs into the Anomaly (draw pile)
4. Determine starting player (Player 0 in browser MVP)

---

## 6. Turn Structure

Each turn follows this sequence:

### A. DRAW
- Draw **2 orbs**
- Hand limit: **3**
- Excess cards must be discarded before continuing

### B. PLAY
- Up to **2 total plays**
- Up to **1 Impact**
- Play options:
  - Place Terraform orb
  - Place Colonization orb
  - Play Impact orb (targets opponent by default)

### C. RESOLVE
- Impacts apply immediately
- Instability is checked

### D. CHECK WIN
- If a player has all 4 Colonization types, they win

---

## 7. Terraforming

Terraforming orbs define planetary conditions.
They enable Colonization and protect against Instability.

---

## 8. Colonization

Colonization represents the development of life.

Requirements:
- Plant → Land + Water
- Animal → Plant
- Sentient → Animal
- High‑Tech → Sentient + 3 Terraform types

Each Colonization increases **planetary vulnerability**, amplifying future impacts.

---

## 9. Impacts

Impacts target the opponent by default.

Severity = 1 + number of Colonizations on target planet.

Effects include:
- Meteor: Removes Terraforming
- Tornado: Disrupts Terraforming
- Earthquake: Removes Terraforming
- Disease: Downgrades Colonization
- Solar Flare: Disables abilities
- Temporal Vortex: Time distortion (future expansion)
- Black Hole: Removes highest Colonization or Terraform

---

## 10. Instability

If Terraform count falls below the minimum:
- Gain 1 Instability Strike
- At 2 strikes, the planet collapses

---

## 11. Winning the Game

A player immediately wins by achieving:
- Plant
- Animal
- Sentient
- High‑Tech

All four Colonization types must be present simultaneously.

---

## 12. Browser MVP Notes

- Medium planets only
- Deterministic impacts
- No physics simulation
- Default opponent targeting
- Local 2 Player only

---

## 13. Future Expansions

- Solo: Entropy Mode
- AI Opponent
- Variable planet sizes
- Core passive enforcement
- Physics‑based impact arena
- Online multiplayer

---

Primordial Orbs © 2026
