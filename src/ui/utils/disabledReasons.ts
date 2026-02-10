import type { GameState, Orb, Phase } from "../../engine/types";
import { DEFAULT_HAND_SIZE_LIMIT, reasonForDisabledOrb, validateIntent } from "./actionValidation";

type SharedCtx = {
  activePlayer: 0 | 1;
  playsRemaining: number;
  impactsRemaining: number;
  abilitiesEnabled: (p: 0 | 1) => boolean;
};

export function getPlayPhaseReason(state: GameState): string | null {
  const result = validateIntent(
    state,
    { type: "END_PLAY" },
    {
      activePlayer: state.active,
      playsRemaining: state.counters.playsRemaining,
      impactsRemaining: state.counters.impactsRemaining,
      abilitiesEnabled: () => true,
      handSizeLimit: DEFAULT_HAND_SIZE_LIMIT,
    },
  );
  return result.ok ? null : result.reason;
}

export function getOrbDisabledReason(
  state: GameState,
  orb: Orb,
  activePlayer: 0 | 1,
  _selectedPhase: Phase,
  playsRemaining: number,
  impactsRemaining: number,
  abilitiesEnabled: (p: 0 | 1) => boolean,
): string | null {
  return reasonForDisabledOrb(state, orb, {
    activePlayer,
    playsRemaining,
    impactsRemaining,
    abilitiesEnabled,
    handSizeLimit: DEFAULT_HAND_SIZE_LIMIT,
  });
}

export function getButtonDisabledReason(
  state: GameState,
  kind: "DRAW" | "END_PLAY" | "ADVANCE",
  ctx: SharedCtx,
): string | null {
  const intent =
    kind === "DRAW"
      ? ({ type: "DRAW_2" } as const)
      : kind === "END_PLAY"
        ? ({ type: "END_PLAY" } as const)
        : ({ type: "ADVANCE" } as const);

  const result = validateIntent(state, intent, {
    ...ctx,
    handSizeLimit: DEFAULT_HAND_SIZE_LIMIT,
  });

  return result.ok ? null : result.reason;
}
