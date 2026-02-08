import { diffSlots } from "./diff";

export type PendingDiff =
  | null
  | {
      kind: "IMPACT";
      at: number;
      impact: string;
      source: 0 | 1;
      target: 0 | 1;
      beforeTargetSlots: any[];
    };

export function beginPendingImpactDiff(
  state: any,
  impact: string,
  source: 0 | 1,
  target: 0 | 1
): PendingDiff {
  return {
    kind: "IMPACT",
    at: Date.now(),
    impact,
    source,
    target,
    beforeTargetSlots: [...state.players[target].planet.slots],
  };
}

export function resolvePendingDiff(
  pending: PendingDiff,
  state: any
):
  | null
  | {
      kind: "IMPACT_RESOLVED";
      at: number;
      impact: string;
      source: 0 | 1;
      target: 0 | 1;
      affectedSlots: number[];
    } {
  if (!pending) return null;
  if (pending.kind !== "IMPACT") return null;

  const afterSlots = state.players[pending.target].planet.slots;
  const affectedSlots = diffSlots(pending.beforeTargetSlots, afterSlots);

  return {
    kind: "IMPACT_RESOLVED",
    at: Date.now(),
    impact: pending.impact,
    source: pending.source,
    target: pending.target,
    affectedSlots,
  };
}
