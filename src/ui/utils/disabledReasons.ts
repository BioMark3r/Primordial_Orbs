import type { GameState, Orb, Phase } from "../../engine/types";
import { canPlaceColonize, canPlaceTerraform, planetColonizeSet, planetTerraformSet } from "../../engine/rules";

export function getPlayPhaseReason(state: GameState): string | null {
  return state.phase === "PLAY" ? null : "Not in Play phase.";
}

function getColonizeRequirementReason(state: GameState, p: 0 | 1, orb: Extract<Orb, { kind: "COLONIZE" }>): string | null {
  const terraformSet = planetTerraformSet(state, p);
  const colonizeSet = planetColonizeSet(state, p);

  switch (orb.c) {
    case "PLANT":
      if (!terraformSet.has("LAND") || !terraformSet.has("WATER")) {
        return "Requires LAND + WATER on your planet.";
      }
      return null;
    case "ANIMAL":
      return colonizeSet.has("PLANT") ? null : "Requires PLANT before ANIMAL.";
    case "SENTIENT":
      return colonizeSet.has("ANIMAL") ? null : "Requires ANIMAL before SENTIENT.";
    case "HIGH_TECH": {
      if (!colonizeSet.has("SENTIENT")) {
        return "Requires SENTIENT before HIGH TECH.";
      }
      if (terraformSet.size < 3) {
        return "Requires 3 different Terraform types.";
      }
      return null;
    }
  }
}

function hasAnyOpenTerraformSlot(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((_, index) => canPlaceTerraform(state, p, index));
}

function hasAnyOpenColonizeSlot(state: GameState, p: 0 | 1, orb: Extract<Orb, { kind: "COLONIZE" }>): boolean {
  return state.players[p].planet.slots.some((_, index) => canPlaceColonize(state, p, orb.c, index));
}

export function getOrbDisabledReason(
  state: GameState,
  orb: Orb,
  activePlayer: 0 | 1,
  selectedPhase: Phase,
  playsRemaining: number,
  impactsRemaining: number
): string | null {
  if (selectedPhase !== "PLAY") {
    return "Not in Play phase.";
  }

  if (playsRemaining === 0) {
    return "No plays remaining.";
  }

  if (orb.kind === "IMPACT" && impactsRemaining === 0) {
    return "No impacts remaining.";
  }

  if (orb.kind === "TERRAFORM") {
    if (state.players[activePlayer].planet.core === "GAS" && orb.t === "ICE") {
      return "Gas cores cannot place ICE terraform.";
    }
    return hasAnyOpenTerraformSlot(state, activePlayer) ? null : "No valid slots available.";
  }

  if (orb.kind === "COLONIZE") {
    const requirementReason = getColonizeRequirementReason(state, activePlayer, orb);
    if (requirementReason) return requirementReason;
    return hasAnyOpenColonizeSlot(state, activePlayer, orb) ? null : "No valid slots available.";
  }

  return null;
}

export function getButtonDisabledReason(phase: Phase, kind: "DRAW" | "END_PLAY" | "ADVANCE"): string | null {
  if (kind === "DRAW") {
    return phase === "DRAW" ? null : "Only available in Draw phase.";
  }
  if (kind === "END_PLAY") {
    return phase === "PLAY" ? null : "Only available in Play phase.";
  }
  if (kind === "ADVANCE") {
    if (phase === "RESOLVE" || phase === "CHECK_WIN") return null;
    if (phase === "PLAY") return "End Play first.";
    return "Only available after End Play.";
  }
  return null;
}
