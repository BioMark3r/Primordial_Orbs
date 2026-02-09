import type { GameState, Impact } from "../../engine/types";

export type FeedbackEvent = {
  kind: "TOAST" | "CORE_PULSE";
  player: 0 | 1;
  key: string;
  title: string;
  detail?: string;
  tone: "info" | "good" | "warn";
};

export type ImpactResolvedSummary = {
  kind: "IMPACT_RESOLVED";
  impact: Impact;
  source: 0 | 1;
  target: 0 | 1;
  affectedSlots: number[];
  at: number;
};

function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}

function hasAnyColonize(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE");
}

type AbilityKey =
  | "LAND_FREE_TERRAFORM_USED"
  | "WATER_SWAP_USED"
  | "ICE_SHIELD_USED"
  | "GAS_REDRAW_USED"
  | "PLANT_MITIGATION_USED"
  | "HIGHTECH_REDIRECT_USED";

function pushUseEvent(
  events: FeedbackEvent[],
  player: 0 | 1,
  key: AbilityKey,
  title: string,
  detail?: string,
  tone: "info" | "good" | "warn" = "good",
) {
  events.push({ kind: "TOAST", player, key, title, detail, tone });
  events.push({ kind: "CORE_PULSE", player, key, title, detail, tone });
}

function pushReadyPulse(events: FeedbackEvent[], player: 0 | 1, key: AbilityKey, title: string) {
  events.push({ kind: "CORE_PULSE", player, key, title, tone: "info" });
}

export function deriveCoreFeedback(
  prev: GameState,
  next: GameState,
  lastImpact?: ImpactResolvedSummary,
): FeedbackEvent[] {
  const events: FeedbackEvent[] = [];

  ([0, 1] as const).forEach((player) => {
    const prevAbilities = prev.players[player].abilities;
    const nextAbilities = next.players[player].abilities;

    if (!prevAbilities.land_free_terraform_used_turn && nextAbilities.land_free_terraform_used_turn) {
      pushUseEvent(events, player, "LAND_FREE_TERRAFORM_USED", "Land Core: Free Terraform used");
    }
    if (prevAbilities.land_free_terraform_used_turn && !nextAbilities.land_free_terraform_used_turn) {
      pushReadyPulse(events, player, "LAND_FREE_TERRAFORM_USED", "Land Core: Free Terraform ready");
    }
    if (!prevAbilities.water_swap_used_turn && nextAbilities.water_swap_used_turn) {
      pushUseEvent(events, player, "WATER_SWAP_USED", "Water Core: Swap used");
    }
    if (prevAbilities.water_swap_used_turn && !nextAbilities.water_swap_used_turn) {
      pushReadyPulse(events, player, "WATER_SWAP_USED", "Water Core: Swap ready");
    }
    if (!prevAbilities.gas_redraw_used_turn && nextAbilities.gas_redraw_used_turn) {
      pushUseEvent(events, player, "GAS_REDRAW_USED", "Gas Core: Redraw used");
    }
    if (prevAbilities.gas_redraw_used_turn && !nextAbilities.gas_redraw_used_turn) {
      pushReadyPulse(events, player, "GAS_REDRAW_USED", "Gas Core: Redraw ready");
    }
    if (!prevAbilities.ice_shield_used_turn && nextAbilities.ice_shield_used_turn) {
      pushUseEvent(events, player, "ICE_SHIELD_USED", "Ice Core: Impact reduced by 1");
    }
    if (prevAbilities.ice_shield_used_turn && !nextAbilities.ice_shield_used_turn) {
      pushReadyPulse(events, player, "ICE_SHIELD_USED", "Ice Core: Shield ready");
    }
    if (!prevAbilities.plant_block_used_round && nextAbilities.plant_block_used_round) {
      pushUseEvent(events, player, "PLANT_MITIGATION_USED", "Plant: Mitigation reduced severity by 1");
    }
    if (prevAbilities.plant_block_used_round && !nextAbilities.plant_block_used_round) {
      pushReadyPulse(events, player, "PLANT_MITIGATION_USED", "Plant: Mitigation ready");
    }
    if (!prevAbilities.hightech_redirect_used && nextAbilities.hightech_redirect_used) {
      pushUseEvent(events, player, "HIGHTECH_REDIRECT_USED", "High-Tech: Redirected incoming impact");
    }

    if (abilitiesEnabled(prev, player) && !abilitiesEnabled(next, player)) {
      events.push({
        kind: "TOAST",
        player,
        key: "SOLAR_FLARE_DISABLED",
        title: "Solar Flare: Abilities disabled until next turn",
        tone: "warn",
      });
    }
  });

  if (lastImpact) {
    if (lastImpact.impact === "DISEASE" && next.players[lastImpact.target].planet.core === "WATER") {
      events.push({
        kind: "TOAST",
        player: lastImpact.target,
        key: "WATER_WEAKNESS",
        title: "Water weakness: Disease +1 severity",
        tone: "warn",
      });
      events.push({
        kind: "CORE_PULSE",
        player: lastImpact.target,
        key: "WATER_WEAKNESS",
        title: "Water weakness triggered",
        tone: "warn",
      });
    }

    const landImpacts: Impact[] = ["METEOR", "TORNADO", "QUAKE", "BLACK_HOLE"];
    const landTarget = next.players[lastImpact.target].planet.core === "LAND";
    const blackHoleWithColonize = lastImpact.impact === "BLACK_HOLE" && hasAnyColonize(prev, lastImpact.target);
    if (landTarget && landImpacts.includes(lastImpact.impact) && !blackHoleWithColonize) {
      events.push({
        kind: "TOAST",
        player: lastImpact.target,
        key: "LAND_WEAKNESS",
        title: "Land weakness: +1 terraform removed",
        tone: "warn",
      });
      events.push({
        kind: "CORE_PULSE",
        player: lastImpact.target,
        key: "LAND_WEAKNESS",
        title: "Land weakness triggered",
        tone: "warn",
      });
    }
  }

  return events;
}
