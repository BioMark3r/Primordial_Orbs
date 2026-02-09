import type { GameState, Impact } from "../../engine/types";

export type ImpactPreview = {
  impact: Impact;
  source: 0 | 1;
  target: 0 | 1;
  vulnerability: number;
  baseSeverity: number;
  severityAfterMods: number;
  modifiers: Array<{ label: string; delta?: number; note?: string }>;
  highTechRedirectPossible: boolean;
  abilitiesEnabledSource: boolean;
  abilitiesEnabledTarget: boolean;
  lavaBoostApplied: boolean;
  waterWeaknessApplied: boolean;
  iceShieldApplied: boolean;
  plantMitigationApplied: boolean;
  landWeaknessApplied: boolean;
  solarFlareActive: boolean;
  summary: string;
};

function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}

function hasPlant(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "PLANT");
}

function hasHighTech(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "HIGH_TECH");
}

function hasAnyColonize(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE");
}

function formatLandWeaknessSuffix(landWeakness: boolean): string {
  return landWeakness ? " Land weakness: terraform-destroying impacts remove +1 additional terraform." : "";
}

export function computeImpactPreview(
  state: GameState,
  impact: Impact,
  source: 0 | 1,
  target: 0 | 1,
): ImpactPreview {
  const sourcePlayer = state.players[source];
  const targetPlayer = state.players[target];
  const vulnerability = targetPlayer.vulnerability;
  const baseSeverity = 1 + vulnerability;
  let severity = baseSeverity;
  const modifiers: ImpactPreview["modifiers"] = [];

  const abilitiesEnabledSource = abilitiesEnabled(state, source);
  const abilitiesEnabledTarget = abilitiesEnabled(state, target);

  const lavaBoostApplied = sourcePlayer.planet.core === "LAVA" && abilitiesEnabledSource;
  if (lavaBoostApplied) {
    severity += 1;
    modifiers.push({ label: "Lava core: +1 outgoing severity", delta: 1 });
  }

  const waterWeaknessApplied = impact === "DISEASE" && targetPlayer.planet.core === "WATER";
  if (waterWeaknessApplied) {
    severity += 1;
    modifiers.push({ label: "Water weakness: Disease +1 severity", delta: 1 });
  }

  const iceShieldApplied =
    targetPlayer.planet.core === "ICE" && abilitiesEnabledTarget && !targetPlayer.abilities.ice_shield_used_turn;
  if (iceShieldApplied) {
    severity = Math.max(1, severity - 1);
    modifiers.push({ label: "Ice core: first incoming impact each turn −1 severity (min 1)", delta: -1 });
  }

  const plantMitigationApplied = abilitiesEnabledTarget && hasPlant(state, target) && !targetPlayer.abilities.plant_block_used_round;
  if (plantMitigationApplied) {
    severity = Math.max(1, severity - 1);
    modifiers.push({ label: "Plant mitigation: −1 severity (min 1) once per round", delta: -1 });
  }

  const solarFlareActive = !abilitiesEnabledSource || !abilitiesEnabledTarget;
  if (solarFlareActive) {
    const noteParts = [!abilitiesEnabledSource ? "Source disabled" : null, !abilitiesEnabledTarget ? "Target disabled" : null]
      .filter((part): part is string => !!part)
      .join(", ");
    modifiers.push({
      label: "Solar Flare active: abilities disabled",
      note: noteParts || undefined,
    });
  }

  const highTechRedirectPossible =
    hasHighTech(state, target) &&
    !targetPlayer.abilities.hightech_redirect_used &&
    abilitiesEnabledTarget &&
    (impact === "METEOR" || impact === "BLACK_HOLE");

  const landWeaknessApplied =
    targetPlayer.planet.core === "LAND" &&
    (["METEOR", "QUAKE", "TORNADO", "BLACK_HOLE"] as Impact[]).includes(impact) &&
    (impact !== "BLACK_HOLE" || !hasAnyColonize(state, target));
  if (landWeaknessApplied) {
    modifiers.push({ label: "Land weakness: +1 terraform removed", note: "Terraform-destroying impacts" });
  }

  let summary = "";
  switch (impact) {
    case "METEOR":
    case "QUAKE":
      summary = `Removes ${severity} terraform.${formatLandWeaknessSuffix(landWeaknessApplied)}`;
      break;
    case "TORNADO": {
      const removeN = Math.max(1, Math.floor(severity / 2));
      summary = `Removes ${removeN} terraform.${formatLandWeaknessSuffix(landWeaknessApplied)}`;
      break;
    }
    case "DISEASE":
      summary = `Applies disease ${severity} times: SENTIENT→ANIMAL→PLANT→remove PLANT.`;
      break;
    case "SOLAR_FLARE":
      summary = "Disables target abilities until next turn.";
      break;
    case "TEMPORAL_VORTEX":
      summary = "Rewinds target planet by 1 recorded step (MVP).";
      break;
    case "BLACK_HOLE": {
      if (hasAnyColonize(state, target)) {
        summary = "Removes one colonization (priority: High-Tech, Sentient, Animal, Plant).";
      } else {
        summary = `No colonization: removes 1 terraform.${formatLandWeaknessSuffix(landWeaknessApplied)}`;
      }
      break;
    }
  }

  return {
    impact,
    source,
    target,
    vulnerability,
    baseSeverity,
    severityAfterMods: severity,
    modifiers,
    highTechRedirectPossible,
    abilitiesEnabledSource,
    abilitiesEnabledTarget,
    lavaBoostApplied,
    waterWeaknessApplied,
    iceShieldApplied,
    plantMitigationApplied,
    landWeaknessApplied,
    solarFlareActive,
    summary,
  };
}
