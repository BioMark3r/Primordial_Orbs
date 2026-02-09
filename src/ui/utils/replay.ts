import type { Action, GameState, Orb } from "../../engine/types";
import type { ReplayBundleV1, ReplayEntryV1 } from "./actionLog";
import { orbKey } from "./actionLog";

type Reducer = (state: GameState, action: Action) => GameState;

function removeFromBag(bag: Orb[], drawn: Orb[]): { bag: Orb[]; ok: boolean } {
  const nextBag = [...bag];
  for (const orb of drawn) {
    const key = orbKey(orb);
    const index = nextBag.findIndex((candidate) => orbKey(candidate) === key);
    if (index === -1) {
      return { bag: nextBag, ok: false };
    }
    nextBag.splice(index, 1);
  }
  return { bag: nextBag, ok: true };
}

function withPatchedDraw(state: GameState, player: 0 | 1, drawn: Orb[]): GameState {
  const removal = removeFromBag(state.bag, drawn);
  if (!removal.ok) {
    throw new Error("Replay failed: expected drawn orb not found in bag.");
  }
  const players = [...state.players] as GameState["players"];
  const hand = [...players[player].hand, ...drawn];
  players[player] = { ...players[player], hand };
  return { ...state, bag: removal.bag, players };
}

function patchHandToMatch(state: GameState, player: 0 | 1, drawn: Orb[], removedIndex?: number): GameState {
  const players = [...state.players] as GameState["players"];
  let hand = [...players[player].hand];
  if (removedIndex !== undefined && removedIndex >= 0 && removedIndex < hand.length) {
    hand.splice(removedIndex, 1);
  }
  hand = [...hand, ...drawn];
  players[player] = { ...players[player], hand };
  return { ...state, players };
}

export function applyReplayEntry(state: GameState, entry: ReplayEntryV1, reducer: Reducer): GameState {
  const player = entry.player;

  switch (entry.type) {
    case "DRAW_2": {
      const next = reducer(state, { type: "DRAW_2" });
      const drawn = (entry.result?.drawn as Orb[] | undefined) ?? [];
      const withoutDraw = { ...next, players: [...next.players] as GameState["players"] };
      withoutDraw.players[player] = { ...withoutDraw.players[player], hand: [...state.players[player].hand] };
      return withPatchedDraw({ ...withoutDraw, bag: [...state.bag] }, player, drawn);
    }
    case "GAS_REDRAW": {
      const action = { type: "GAS_REDRAW", handIndex: entry.payload?.handIndex ?? 0 } as Action;
      const next = reducer(state, action);
      const drawn = (entry.result?.drawn as Orb[] | undefined) ?? [];
      const removedIndex = entry.payload?.handIndex as number | undefined;
      const cleared = patchHandToMatch(state, player, drawn, removedIndex);
      const removal = removeFromBag(state.bag, drawn);
      if (!removal.ok) {
        throw new Error("Replay failed: expected drawn orb not found in bag.");
      }
      const players = [...next.players] as GameState["players"];
      players[player] = { ...players[player], hand: cleared.players[player].hand };
      return { ...next, players, bag: removal.bag };
    }
    case "DISCARD_FROM_HAND":
      return reducer(state, { type: "DISCARD_FROM_HAND", index: entry.payload?.index ?? 0 });
    case "PLAY_TERRAFORM":
      return reducer(state, {
        type: "PLAY_TERRAFORM",
        handIndex: entry.payload?.handIndex ?? 0,
        slotIndex: entry.payload?.slotIndex ?? 0,
      });
    case "PLAY_COLONIZE":
      return reducer(state, {
        type: "PLAY_COLONIZE",
        handIndex: entry.payload?.handIndex ?? 0,
        slotIndex: entry.payload?.slotIndex ?? 0,
      });
    case "PLAY_IMPACT":
      return reducer(state, {
        type: "PLAY_IMPACT",
        handIndex: entry.payload?.handIndex ?? 0,
        target: entry.payload?.target ?? 0,
      });
    case "WATER_SWAP":
      return reducer(state, {
        type: "WATER_SWAP",
        slotA: entry.payload?.slotA ?? 0,
        slotB: entry.payload?.slotB ?? 0,
      });
    case "END_PLAY":
      return reducer(state, { type: "END_PLAY" });
    case "ADVANCE":
      return reducer(state, { type: "ADVANCE" });
    default:
      return state;
  }
}

export function replayFromStart(bundle: ReplayBundleV1, reducer: Reducer): GameState {
  let next = structuredClone(bundle.initial) as GameState;
  for (const entry of bundle.entries) {
    next = applyReplayEntry(next, entry, reducer);
  }
  return next;
}

export function validateReplayMatchesCurrent(replayed: GameState, current: GameState): boolean {
  return JSON.stringify(replayed) === JSON.stringify(current);
}
