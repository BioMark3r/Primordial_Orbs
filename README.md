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

## 🏭 Production Build & Packaging

Build a production bundle:

```bash
npm run build
```

Preview the production bundle locally:

```bash
npm run preview
```

Build and run the production Docker image:

```bash
make web-docker-build
make web-docker-run
```

The containerized app is served at `http://localhost:8080`.

- Nginx serves the built `dist` output.
- SPA routes fall back to `index.html`.
- Hashed assets under `/assets/` are sent with long-lived immutable cache headers.
- `index.html` is intentionally not long-cached to prevent stale deployments.
- CI validates dependency install, optional lint/tests, production build, and Docker image build.

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
- Vite orb sprites: place ornate orb assets in `/public/assets/orbs` and reference at runtime as `/assets/orbs/...`

### Orb visual animation pipeline

- Shared orb rendering now lives in `src/ui/components/OrbVisual.tsx` and is reused by hand, slot, and impact preview contexts.
- `src/ui/components/OrbToken.tsx` is the interaction wrapper (click/disabled/tooltips), while `OrbVisual` owns orb framing + animation classes.
- Tune motion/glow in:
  - `src/ui/theme/orbs.css` (idle breathing, hover pulse, selected halo, entrance timing)
  - `src/ui/theme/layout.css` (slot placement ripple)
  - `src/ui/theme/arena.css` (arena/impact flash + last-impact polish)
- Keep gameplay logic in engine/reducer files; visual changes should stay in UI components/theme CSS unless a UI event flag is needed.

---


## 🧰 SVG Icon Normalization (No Binary Changes)

Some orb/core SVGs can look visually undersized when their artwork only occupies a small portion of the SVG canvas. This repo includes a deterministic normalization utility that tightens each SVG `viewBox` to the actual geometry bounds and adds a small safety margin, so icons fill their slot more consistently without rasterizing assets.

- Script: `scripts/normalize-svg-viewbox.mjs`
- Default targets: `src/assets/orbs` and `src/assets/cores`
- Default padding: `6%` of max(art width, art height)
- Output stays SVG/text-only (no PNG/WebP generation)

Check whether files need normalization:

```bash
npm run icons:check
```

Normalize SVGs in place:

```bash
npm run icons:normalize
```

Notes:
- The script preserves/ensures `viewBox` and removes fixed `width`/`height` attributes when found, so scaling remains responsive in the React/Vite pipeline.
- `--check` exits non-zero if a file would change (CI-friendly).
- For safety, SVGs with transforms or unsupported constructs are skipped with warnings instead of being rewritten.
- This workflow is intentionally text-only so Codex/PR review stays clean and diffable.

## 🤖 AI & Solo Play

AI is simple and deterministic, designed for playtesting.

---

## 🔊 Audio

Audio is driven by `src/audio/audioManager.ts` with path wiring in `src/audio/audioManifest.ts`.

- Asset locations:
  - SFX: `public/sfx/*.mp3`
  - Ambient music: `public/music/ambient_space.mp3`
- Logical SFX events: `click`, `orbPlace`, `impactCast`, `impactLand`, `draw`, `endPlay`, `error`, `unlock`.
- Logical music events: `ambient`.
- To replace a sound, keep the same filename/path in `public/` or update only `src/audio/audioManifest.ts`.
- SFX playback applies subtle per-play pitch/volume variation to avoid robotic repeats.
- Ambient music is looped and **does not** use playback variation.

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

---

## ✅ Verify Local Setup

Use this quick checklist after setup to confirm your local environment is healthy.

### 1️⃣ Docker is running

```bash
docker ps
```

You should see Docker respond without daemon/permission errors.

### 2️⃣ Supabase local stack is running

```bash
npm run dev:db
```

Then verify status:

```bash
cd server && npx supabase status
```

### 3️⃣ Frontend is running

```bash
npm run dev
```

Open `http://localhost:5173` (or `http://localhost:5173/?demo=1` for deterministic demo mode).

### 4️⃣ Env variables are configured

```bash
cd server && npx supabase status -o env
```

Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into your local `.env.local` (see `server/.env.example`).

For full backend setup/details, see [`server/README.md`](server/README.md).
