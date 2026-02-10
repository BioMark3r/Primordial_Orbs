import type { GameState } from "../engine/types";
import { DEMO_STATE_V1 } from "./demoState";

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function getParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

export function isDemoModeRequested(): boolean {
  const params = getParams();
  return params?.get("demo") === "1";
}

export function isScreenshotModeRequested(): boolean {
  const params = getParams();
  return params?.get("demo") === "1" && params.get("shots") === "1";
}

export function loadDemoStateIfRequested(): GameState | null {
  if (!isDemoModeRequested()) return null;
  return cloneState(DEMO_STATE_V1);
}

export function applyScreenshotStabilityModeIfRequested(): void {
  if (!isScreenshotModeRequested()) return;
  if (typeof document === "undefined") return;
  const styleId = "demo-shots-disable-animations";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
    }
  `;
  document.head.appendChild(style);
}
