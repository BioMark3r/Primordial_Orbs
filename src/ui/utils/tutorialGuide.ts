import type { Colonize, Impact, Terraform } from "../../engine/types";

export type ActionEvent =
  | { type: "DRAW_2"; at: number; player: 0 | 1 }
  | { type: "PLAY_TERRAFORM"; at: number; player: 0 | 1; terra: Terraform }
  | { type: "PLAY_COLONIZE"; at: number; player: 0 | 1; colonize: Colonize }
  | { type: "PLAY_IMPACT"; at: number; player: 0 | 1; impact: Impact; target: 0 | 1 }
  | { type: "WATER_SWAP"; at: number; player: 0 | 1 }
  | { type: "GAS_REDRAW"; at: number; player: 0 | 1 }
  | { type: "END_PLAY"; at: number; player: 0 | 1 }
  | { type: "ADVANCE"; at: number; player: 0 | 1 }
  | { type: "DISCARD"; at: number; player: 0 | 1 };

export type GuideTrigger =
  | { kind: "ACTION"; type: ActionEvent["type"] }
  | { kind: "PHASE"; phase: string };

export type GuideMode = "MANUAL" | "GUIDED";

export function triggerMatches(
  step: { advanceOn?: GuideTrigger },
  evt: ActionEvent,
  activePlayer: 0 | 1
): boolean {
  if (!step.advanceOn) return false;
  if (step.advanceOn.kind !== "ACTION") return false;
  return step.advanceOn.type === evt.type && evt.player === activePlayer;
}

export function nextIndexOnEvent<T extends { advanceOn?: GuideTrigger }>(
  steps: T[],
  currentIndex: number,
  evt: ActionEvent,
  activePlayer: 0 | 1,
  mode: GuideMode
): number {
  if (mode !== "GUIDED") return currentIndex;
  if (!steps[currentIndex]) return currentIndex;
  if (triggerMatches(steps[currentIndex], evt, activePlayer)) {
    return Math.min(currentIndex + 1, steps.length - 1);
  }
  return currentIndex;
}
