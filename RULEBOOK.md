# Primordial Orbs — MVP Rulebook (Post-Polish)

Welcome to **Primordial Orbs**, a fast head-to-head planet builder where every turn asks: _grow your world_ or _wreck theirs_.

---

## 1) Overview / Win Condition

You and your rival each shape a planet from raw Terraform orbs, then develop life through four milestones:

- **Plant**
- **Animal**
- **Sentient**
- **High-Tech**

### How you win
Unlock all four colonization types on your planet at the same time. The first player to do that wins.

---

## 2) Components (digital UI components)

Everything is represented in the browser UI:

- **Setup screen** (core selection, seed, mode options)
- **Two player panels** (one planet each)
- **Hand panel** (Terraform / Colonize / Impact orbs)
- **Turn controls** (Draw, End Play, Advance, Undo)
- **Core Status strip** (passives, readiness, weaknesses at a glance)
- **Impact Preview panel** (severity math + effect summary before you commit)
- **Progress Track** (Plant/Animal/Sentient/High-Tech unlocks)
- **Action Log drawer**
- **Top menus**: Game ▾, View ▾, Help ▾
- **Overlays**: turn handoff, turn recap toast, tutorials, save/load code dialogs

![Setup screen](public/rulebook/01_setup.png)
![Game overview](public/rulebook/02_game_overview.png)

---

## 3) Setup

1. From Setup, choose each player's **Core**.
2. Planet size is currently **Medium (fixed)**.
3. Optional: set a **Seed** for reproducible matches.
4. Optional: enable **Play vs Computer**.
   - Difficulty: **Easy**
   - Personality: **Balanced / Builder / Aggressive**
   - AI Speed: **Fast / Normal**
5. Click **Start Game**.

Quick note: slot labels are shown as **Slot 1..N** (not 0-based), even though internal logic uses indexes.

![Splash](public/rulebook/00_splash.png)

---

## 4) Turn Flow (with clear numbered steps)

Every turn runs in this order:

1. **Draw**
   - Click **Draw** to draw 2 orbs.
   - Hand cap is 3; if over cap, discard down before continuing.

2. **Play**
   - Spend your turn economy (details in next section).
   - Place Terraform/Colonize, play an Impact, or use core actions when legal.

3. **End Play**
   - Click **End Play** when you're done acting.
   - If available, the UI nudges this button with a highlight and “Ready to End Play”.

4. **Advance**
   - Click **Advance** to resolve and pass turn.
   - A short **Turn Recap** overlay appears (what happened this turn), then control hands off.

---

## 5) Actions (Terraform / Colonize / Impacts)

## Terraform
- Select a Terraform orb in hand, then click an empty slot on your active planet.
- You generally need Terraform stability to support colonization.

## Colonize
- Select a Colonize orb, then click an empty valid slot.
- Colonization types feed your progress track and win condition.

## Impacts
- Select an Impact orb in hand.
- Choose target (default is opponent), then play it.
- Impacts are limited by your per-turn Impact budget.

### Play Phase economy (important)
During Play, watch the top counters:

- **Plays remaining**
- **Impacts remaining**

The UI enforces legal actions:

- Invalid actions are disabled.
- Disabled buttons show tooltip reasons.
- End Play / Advance can pulse with “ready” nudges when appropriate.

![Hand panel](public/rulebook/03_hand_panel.png)

---

## 6) Core Passives

Each core has a passive and a weakness. The game surfaces this in two ways:

1. **Core Status strip** (ready/used state for key passives)
2. **Toasts + visual pulse** when passives trigger

Current core identities:

- **Land**: first Terraform each turn can be free.
- **Water**: swap two Terraform slots once per turn.
- **Ice**: first impact against you each turn is reduced.
- **Lava**: your impacts hit harder.
- **Gas**: once per turn, Shift-click hand orb to redraw.

If Solar Flare disables abilities, the strip reflects it.

![Core status](public/rulebook/05_core_status.png)

---

## 7) Impacts & Targeting + Impact Preview

When you select an Impact, the **Impact Preview** panel shows:

- source and target player
- base severity and modifier-adjusted severity
- active modifiers (core/passive interactions)
- effect summary before resolution

### Targeting
- Default impact target is your **opponent**.
- You can retarget (for effects or edge plays) before committing.

### Temporal Vortex (implemented)
Temporal Vortex rewinds the target planet by one recorded planet-state step (deterministic behavior). If no state is available, it fizzles.

![Impact preview](public/rulebook/06_impact_preview.png)
![Arena effects](public/rulebook/04_arena_fx.png)

---

## 8) Progress Track / Colonization Types

The track shows four unlocks:

1. Plant
2. Animal
3. Sentient
4. High-Tech

When you unlock a new type:

- icon lights up
- short celebration feedback appears

Unlock all four to trigger win celebration and end the match.

![Progress track](public/rulebook/07_progress_track.png)

---

## 9) Solo vs CPU

Enable **Play vs Computer** in Setup.

### CPU mode in this build
- Difficulty available: **Easy**
- Personalities:
  - **Balanced**: mixed growth and pressure
  - **Builder**: more colonization/terraform priority
  - **Aggressive**: more impact pressure
- **AI Speed** toggle controls pacing (Fast/Normal)

This is deterministic enough to replay with the same seed + action flow.

---

## 10) Hotseat / Local 2P

Local two-player (hotseat) play is fully supported.

- Inactive side is visually dimmed while active side is highlighted.
- Turn transition shows a brief handoff overlay (“Player X’s Turn — Draw to begin”).
- This keeps pass-and-play readable without hiding board state.

---

## 11) Menus & Tools (Save/Load, Match Code, Replay, Log)

Top-right menus:

### Game ▾
- New Game / Quit / Setup
- **Save / Load** (local storage snapshot)
- **Export Match Code / Import Match Code**
  - Match Code = serialized game state for sharing/restoring the exact current position.
- **Export Replay / Import Replay**
  - Replay bundle = start state + action history data for reproduction.
- **Replay From Start**
  - Replays the current match sequence from initial state.

### View ▾
- Show/Hide **Action Log**
- Pause/Resume AI (when in vs CPU)

### Help ▾
- **Tutorial (Guided)**
- **Tutorial (Manual)**
- **How to Play**
- **Keyboard Shortcuts**
- **Rulebook**

### Action Log + replay determinism notes
- Action Log is your running event history for quick debugging and learning.
- Replay tools are designed for reproducibility.
- For best deterministic results, keep seed + replay bundle together.

![Help menu](public/rulebook/09_help_menu.png)

---

## 12) Keyboard Shortcuts

- **D** — Draw 2
- **E** — End Play
- **A** — Advance Turn
- **U** — Undo
- **L** — Toggle Log
- **?** or **Shift + /** — Open Tutorial
- **Esc** — Clear Selection

---

## 13) FAQ / Troubleshooting

### “Why can’t I click Draw / End Play / Advance?”
If a turn button is disabled, hover it for the reason tooltip. The game only enables legal actions for the current phase/state.

### “My impact didn’t do what I expected.”
Open/observe Impact Preview first; it includes current modifiers (vulnerability, passives, weakness adjustments, mitigation).

### “How do I share a match?”
Use **Game ▾ → Export Match Code**. Your opponent can import it with **Import Match Code**.

### “What’s the difference between Match Code and Replay?”
- **Match Code** restores a single current snapshot.
- **Replay Bundle** restores the starting point and action timeline for playback.

### “Does slot numbering start at 0?”
In the UI, slot labels are player-facing **1 to N**.

### “Can I play solo?”
Yes—enable **Play vs Computer** in Setup and choose personality/speed.
