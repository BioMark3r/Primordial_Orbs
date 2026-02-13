# 🌍 Primordial Orbs

**Primordial Orbs** is a turn-based, two-player strategy game about terraforming planets, evolving life, and destabilizing your opponent through catastrophic events.  
This repository contains the **local hotseat + solo-play MVP**, built as a one-screen web game with a strong emphasis on clarity, polish, and testability.

---

## ✨ Current Features

- Local 2-player hotseat play
- Solo play vs basic AI (personality toggles)
- Terraforming, Colonization, and Impact systems
- Asymmetric planet cores with passive abilities
- Action log + full replay from start
- Undo / History system
- Turn Coach hints + guided first turn
- One-screen responsive UI (no scrolling)
- Visual polish:
  - Marble-style orbs with etched symbols
  - Subtle shimmer on hover/selection
  - Cataclysm Arena FX
- Deterministic **Demo Mode** for testing
- Automated **Playwright UI layout guardrails**

> Networking multiplayer is a **future goal** — architecture decisions are being made with that in mind, but no network code exists yet.

---

## 🧱 Tech Stack

- **Frontend:** React + TypeScript (strict)
- **Styling:** CSS tokens + component primitives (no UI framework)
- **State:** Deterministic reducer-driven game engine
- **Testing:** Playwright (UI layout + visual regression)
- **Tooling:** ChatGPT Codex used for structured PR-sized changes

No backend, no database, no canvas.

Local profiles and match stats are stored on this device (localStorage only).

## Backend (Optional – Supabase Local)

Local Supabase is optional today; it is used for future Google Auth, cloud stats, and networking foundation work.

```bash
npm run dev:all
npm run dev:db
npm run dev:db:stop
```

See `/server/README.md` for full setup.

## Common Errors

### 1) Docker socket permission denied

If you see an error like `permission denied while trying to connect to the Docker daemon socket...`, run:

```bash
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

### 2) Docker daemon not running

```bash
docker ps
sudo systemctl start docker
```

On WSL, ensure Docker Desktop integration is enabled if you use Docker Desktop.

### 3) Missing npm scripts (`dev:db` not found)

```bash
npm run
```

Confirm script names in the root `package.json` (`dev:db`, `dev:db:stop`, `dev:all`).

---

## 🚀 Getting Started

### Install
```bash
npm install
```

### Run locally
```bash
npm run dev
```

Open:
```
http://localhost:5173
```

---

## 🧪 Demo / Test Mode

To run the game in a **stable, deterministic state** (used by tests and screenshots):

```
http://localhost:5173/?demo=1
```

Optional flags:
- `&shots=1` – disables animations/transitions for stable screenshots

Share setup links:
- `?cfg=...` pre-fills setup values (cores, mode, AI options, seed, density)
- `&autostart=1` starts immediately with that setup
- Share links only include setup config (no match history, hand/deck, or private state)

---

## 🧠 Controls

- **Mouse:** All actions clickable
- **Keyboard shortcuts:**
  - `D` – Draw
  - `E` – End Play
  - `A` – Advance
  - `U` – Undo  

---

## 🧩 Project Structure (high level)

```
src/
 ├─ engine/
 ├─ ui/
 │   ├─ components
 │   ├─ icons
 │   ├─ theme
 │   └─ utils
 └─ main.tsx
tests/
 ├─ ui.layout.spec.ts
 └─ helpers/layout.ts
```

---

## 🧪 UI Layout Guardrails

Run UI tests:
```bash
npm run test:ui
```

Update visual baselines:
```bash
npm run test:ui:update
```

---

## 🎨 Visual Design System

- Theme tokens: `src/ui/theme/tokens.css`
- Components: `components.css`
- Orbs: `orbs.css`

---

## 🤖 AI & Solo Play

AI is simple and deterministic, designed for playtesting.

---

## 🔊 Audio (Planned)

Hooks exist, assets not yet included.

---

## 🛠 Development Philosophy

- One PR = one focused improvement
- Prefer clarity over cleverness
- No silent layout regressions

---

## 🧭 Roadmap

- External playtesting
- Balance tuning
- Expanded solo mode
- Networking foundation

---

## 📜 License

TBD
