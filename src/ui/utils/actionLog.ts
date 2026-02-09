import type { Action, GameState, Orb } from "../../engine/types";

export type ReplayEntryV1 = {
  v: 1;
  id: string;
  at: number;
  player: 0 | 1;
  type: string;
  payload: any;
  result?: any;
};

export type ReplayBundleV1 = {
  v: 1;
  app: "primordial-orbs";
  createdAt: number;
  initial: GameState;
  entries: ReplayEntryV1[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function orbKey(orb: Orb): string {
  switch (orb.kind) {
    case "TERRAFORM":
      return `TERRAFORM:${orb.t}`;
    case "COLONIZE":
      return `COLONIZE:${orb.c}`;
    case "IMPACT":
      return `IMPACT:${orb.i}`;
    default:
      return "UNKNOWN";
  }
}

export function diffAddedOrbs(before: Orb[], after: Orb[]): Orb[] {
  const counts = new Map<string, number>();
  for (const orb of before) {
    const key = orbKey(orb);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const added: Orb[] = [];
  for (const orb of after) {
    const key = orbKey(orb);
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) {
      counts.set(key, remaining - 1);
    } else {
      added.push(orb);
    }
  }
  return added;
}

export function shouldRecordReplay(action: Action): boolean {
  switch (action.type) {
    case "DRAW_2":
    case "DISCARD_FROM_HAND":
    case "PLAY_TERRAFORM":
    case "PLAY_COLONIZE":
    case "PLAY_IMPACT":
    case "WATER_SWAP":
    case "GAS_REDRAW":
    case "END_PLAY":
    case "ADVANCE":
      return true;
    case "NEW_GAME":
      return false;
    default:
      return false;
  }
}

export function actionPayload(action: Action): ReplayEntryV1["payload"] {
  switch (action.type) {
    case "DRAW_2":
    case "END_PLAY":
    case "ADVANCE":
      return null;
    case "DISCARD_FROM_HAND":
      return { index: action.index };
    case "PLAY_TERRAFORM":
      return { handIndex: action.handIndex, slotIndex: action.slotIndex };
    case "PLAY_COLONIZE":
      return { handIndex: action.handIndex, slotIndex: action.slotIndex };
    case "PLAY_IMPACT":
      return { handIndex: action.handIndex, target: action.target };
    case "WATER_SWAP":
      return { slotA: action.slotA, slotB: action.slotB };
    case "GAS_REDRAW":
      return { handIndex: action.handIndex };
    case "NEW_GAME":
      return {
        mode: action.mode,
        coreP0: action.coreP0,
        coreP1: action.coreP1,
        seed: action.seed,
      };
    default:
      return null;
  }
}

export function getDrawResult(action: Action, before: GameState, after: GameState, player: 0 | 1) {
  if (action.type !== "DRAW_2" && action.type !== "GAS_REDRAW") return undefined;
  const beforeHand = before.players[player].hand;
  const afterHand = after.players[player].hand;
  const drawn = diffAddedOrbs(beforeHand, afterHand);
  return { drawn };
}

export function validateReplayBundle(
  value: unknown,
): { ok: true; payload: ReplayBundleV1 } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "Replay payload is not an object." };
  }
  if (value.v !== 1) {
    return { ok: false, error: "Unsupported replay version." };
  }
  if (value.app !== "primordial-orbs") {
    return { ok: false, error: "Replay app id mismatch." };
  }
  if (typeof value.createdAt !== "number") {
    return { ok: false, error: "Replay createdAt must be a number." };
  }
  if (!isRecord(value.initial)) {
    return { ok: false, error: "Replay initial state missing." };
  }
  if (!Array.isArray(value.entries)) {
    return { ok: false, error: "Replay entries must be an array." };
  }
  for (const entry of value.entries) {
    if (!isRecord(entry)) {
      return { ok: false, error: "Replay entry is not an object." };
    }
    if (entry.v !== 1) {
      return { ok: false, error: "Replay entry version invalid." };
    }
    if (typeof entry.id !== "string") {
      return { ok: false, error: "Replay entry id missing." };
    }
    if (typeof entry.at !== "number") {
      return { ok: false, error: "Replay entry timestamp missing." };
    }
    if (entry.player !== 0 && entry.player !== 1) {
      return { ok: false, error: "Replay entry player invalid." };
    }
    if (typeof entry.type !== "string") {
      return { ok: false, error: "Replay entry type missing." };
    }
  }
  return { ok: true, payload: value as ReplayBundleV1 };
}
