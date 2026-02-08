# Primordial Orbs (Browser MVP)

This ZIP is a **vanilla HTML/CSS/JS** browser MVP shell with a splash screen that uses the new **Primordial Orbs** logo.

## Run locally

### Option A: Python (recommended)
From this folder:

```bash
python -m http.server 5173
```

Then open:
- `http://localhost:5173`

### Option B: Node (if you prefer)

```bash
npx http-server -p 5173
```

## Files

- `index.html` — App shell (Splash → Setup → Game)
- `assets/logo.png` — Splash/logo image
- `src/styles.css` — Styles + splash glow + layout
- `src/main.js` — State machine + placeholder match loop

## Notes

- The **splash screen** is wired to the UI state machine.
- The **Game screen** includes a simple status strip showing:
  - Each player’s Core (name, passive text)
  - Core HP
  - A placeholder **Temporal Vortex** tracker

When you’re ready, we can wire this shell into your full rules engine / turn resolver.
