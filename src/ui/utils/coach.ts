import { COLONIZE_REQ, HAND_CAP, MVP_PLANET_SLOTS, MVP_TERRAFORM_MIN } from "../../engine/constants";
import type { GameState } from "../../engine/types";
import { canPlaceColonize, planetColonizeSet, planetTerraformSet, terraformCount } from "../../engine/rules";

export type CoachHint = {
  tone: "info" | "warn" | "good";
  title: string;
  detail?: string;
  actionLabel?: string;
};

function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}

function hasPlantPlaced(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "PLANT");
}

function hasPlantInHand(state: GameState, p: 0 | 1): boolean {
  return state.players[p].hand.some((o) => o.kind === "COLONIZE" && o.c === "PLANT");
}

function hasImpactInHand(state: GameState, p: 0 | 1): boolean {
  return state.players[p].hand.some((o) => o.kind === "IMPACT");
}

function canPlacePlantNow(state: GameState, p: 0 | 1): boolean {
  if (state.phase !== "PLAY") return false;
  if (state.counters.playsRemaining <= 0) return false;
  const terraformSet = planetTerraformSet(state, p);
  const colonizeSet = planetColonizeSet(state, p);
  if (!COLONIZE_REQ.PLANT(terraformSet, colonizeSet)) return false;
  return Array.from({ length: MVP_PLANET_SLOTS }, (_, index) => index).some((slotIndex) =>
    canPlaceColonize(state, p, "PLANT", slotIndex),
  );
}

export function getCoachHints(state: GameState): CoachHint[] {
  const hints: CoachHint[] = [];
  const active = state.active;
  const activePlayer = state.players[active];
  const abilitiesOn = abilitiesEnabled(state, active);

  if (state.phase === "DRAW") {
    hints.push({
      tone: "info",
      title: "Draw 2 to begin your turn.",
      actionLabel: "Draw 2",
    });

    if (activePlayer.hand.length > HAND_CAP) {
      hints.push({
        tone: "warn",
        title: "Hand overflow: discard down to 3.",
      });
    }
  }

  if (!abilitiesOn) {
    hints.push({
      tone: "warn",
      title: "Solar Flare: your abilities are disabled this turn.",
    });
  }

  if (state.phase === "PLAY" && abilitiesOn) {
    if (activePlayer.planet.core === "WATER" && !activePlayer.abilities.water_swap_used_turn) {
      hints.push({
        tone: "info",
        title: "Water Swap available: click two Terraform slots to swap.",
      });
    }

    if (activePlayer.planet.core === "GAS" && !activePlayer.abilities.gas_redraw_used_turn) {
      hints.push({
        tone: "info",
        title: "Gas Redraw available: Shift-click a hand orb to discard+draw.",
      });
    }

    if (activePlayer.planet.core === "LAND" && !activePlayer.abilities.land_free_terraform_used_turn) {
      hints.push({
        tone: "good",
        title: "Land: your first Terraform this turn is free.",
      });
    }
  }

  if (state.phase === "PLAY") {
    hints.push({
      tone: "info",
      title: `Plays remaining: ${state.counters.playsRemaining}. Impacts remaining: ${state.counters.impactsRemaining}.`,
    });
  }

  if (terraformCount(state, active) <= MVP_TERRAFORM_MIN) {
    hints.push({
      tone: "warn",
      title: "Terraform minimum is 3. If you drop below, instability strikes apply.",
    });
  }

  if (
    state.phase === "PLAY" &&
    !hasPlantPlaced(state, active) &&
    hasPlantInHand(state, active) &&
    canPlacePlantNow(state, active)
  ) {
    hints.push({
      tone: "info",
      title: "You can place PLANT (requires LAND + WATER on planet).",
    });
  }

  if (
    state.phase === "PLAY" &&
    state.counters.playsRemaining > 0 &&
    state.counters.impactsRemaining > 0 &&
    hasImpactInHand(state, active) &&
    state.players[state.active === 0 ? 1 : 0].vulnerability >= 2
  ) {
    hints.push({
      tone: "info",
      title: "Opponent is vulnerable; an impact may be stronger now.",
    });
  }

  return hints.slice(0, 4);
}
