import type { GameState, Phase } from "../../engine/types";

type SavePayloadV1 = {
  v: 1;
  createdAt: number;
  app: "primordial-orbs";
  state: GameState;
};

const STORAGE_KEY = "po_save_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPhase(value: unknown): value is Phase {
  return value === "DRAW" || value === "PLAY" || value === "RESOLVE" || value === "CHECK_WIN" || value === "GAME_OVER";
}

function validatePayload(value: unknown): { ok: true; payload: SavePayloadV1 } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "Payload is not an object." };
  }
  if (value.v !== 1) {
    return { ok: false, error: "Unsupported payload version." };
  }
  if (value.app !== "primordial-orbs") {
    return { ok: false, error: "Payload app id mismatch." };
  }
  if (typeof value.createdAt !== "number") {
    return { ok: false, error: "Payload createdAt must be a number." };
  }
  if (!isRecord(value.state)) {
    return { ok: false, error: "Payload state missing." };
  }
  const state = value.state as Record<string, unknown>;
  const players = state.players;
  if (!Array.isArray(players) || players.length !== 2) {
    return { ok: false, error: "State players must be an array of length 2." };
  }
  if (!isPhase(state.phase)) {
    return { ok: false, error: "State phase is invalid." };
  }
  if (state.active !== 0 && state.active !== 1) {
    return { ok: false, error: "State active player must be 0 or 1." };
  }
  if (typeof state.turn !== "number") {
    return { ok: false, error: "State turn must be a number." };
  }
  if (!Array.isArray(state.bag) || !Array.isArray(state.discard)) {
    return { ok: false, error: "State bag/discard must be arrays." };
  }
  if (!Array.isArray(state.log)) {
    return { ok: false, error: "State log must be an array." };
  }
  return { ok: true, payload: value as SavePayloadV1 };
}

function base64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64DecodeUtf8(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function makePayload(state: GameState): SavePayloadV1 {
  return {
    v: 1,
    createdAt: Date.now(),
    app: "primordial-orbs",
    state,
  };
}

export function saveToLocalStorage(state: GameState): { ok: true } | { ok: false; error: string } {
  try {
    const payload = makePayload(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to save: ${message}` };
  }
}

export function loadFromLocalStorage(): { ok: true; payload: SavePayloadV1 } | { ok: false; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ok: false, error: "No save found." };
    }
    const parsed = JSON.parse(raw) as unknown;
    const result = validatePayload(parsed);
    if (!result.ok) {
      return result;
    }
    return { ok: true, payload: result.payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Failed to load: ${message}` };
  }
}

export function exportMatchCode(state: GameState): string {
  const payload = makePayload(state);
  return base64EncodeUtf8(JSON.stringify(payload));
}

export function importMatchCode(code: string): { ok: true; payload: SavePayloadV1 } | { ok: false; error: string } {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a match code to import." };
  }
  try {
    const json = base64DecodeUtf8(trimmed);
    const parsed = JSON.parse(json) as unknown;
    const result = validatePayload(parsed);
    if (!result.ok) {
      return result;
    }
    return { ok: true, payload: result.payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Invalid match code: ${message}` };
  }
}

export type { SavePayloadV1 };
export { STORAGE_KEY };
