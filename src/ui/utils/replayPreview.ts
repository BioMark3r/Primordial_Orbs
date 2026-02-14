import type { Action, GameState } from "../../engine/types";
import type { ReplayEntryV1 } from "./actionLog";
import { applyReplayEntry } from "./replay";

type Reducer = (state: GameState, action: Action) => GameState;

export function buildReplayState(
  initialState: GameState,
  actions: ReplayEntryV1[],
  uptoIndex: number,
  reducer: Reducer,
): GameState {
  let next = structuredClone(initialState) as GameState;
  if (uptoIndex < 0 || actions.length === 0) return next;

  const limit = Math.min(uptoIndex, actions.length - 1);
  for (let index = 0; index <= limit; index += 1) {
    next = applyReplayEntry(next, actions[index], reducer);
  }
  return next;
}
