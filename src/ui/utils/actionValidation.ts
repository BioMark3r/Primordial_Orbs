import { HAND_CAP } from "../../engine/constants";
import { canPlaceColonize, canPlaceTerraform, planetColonizeSet, planetTerraformSet } from "../../engine/rules";
import type { GameState, Orb } from "../../engine/types";

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; code?: string };

export type ActionIntent =
  | { type: "DRAW_2" }
  | { type: "DISCARD_FROM_HAND"; handIndex: number }
  | { type: "PLAY_TERRAFORM"; handIndex: number; slotIndex: number }
  | { type: "PLAY_COLONIZE"; handIndex: number; slotIndex: number }
  | { type: "PLAY_IMPACT"; handIndex: number; target: 0 | 1 }
  | { type: "WATER_SWAP"; a: number; b: number }
  | { type: "GAS_REDRAW"; handIndex: number }
  | { type: "END_PLAY" }
  | { type: "ADVANCE" }
  | { type: "UNDO" }
  | { type: "LOAD_STATE" }
  | { type: "REPLAY_FROM_START" };

export type ValidationContext = {
  activePlayer: 0 | 1;
  playsRemaining: number;
  impactsRemaining: number;
  abilitiesEnabled: (p: 0 | 1) => boolean;
  handSizeLimit: number;
  hasUndoHistory?: boolean;
};

function fail(reason: string, code?: string): ValidationResult {
  return { ok: false, reason, ...(code ? { code } : {}) };
}

function requiresDiscard(state: GameState, ctx: ValidationContext): boolean {
  return state.phase === "DRAW" && state.players[ctx.activePlayer].hand.length > ctx.handSizeLimit;
}

function validateHandIndex(state: GameState, handIndex: number, activePlayer: 0 | 1): ValidationResult {
  const hand = state.players[activePlayer].hand;
  if (handIndex < 0 || handIndex >= hand.length) {
    return fail("Invalid hand selection.", "HAND_INDEX_INVALID");
  }
  return { ok: true };
}

function validateColonizeRequirement(state: GameState, p: 0 | 1, orb: Extract<Orb, { kind: "COLONIZE" }>): ValidationResult {
  const terraformSet = planetTerraformSet(state, p);
  const colonizeSet = planetColonizeSet(state, p);

  switch (orb.c) {
    case "PLANT":
      if (!terraformSet.has("LAND") || !terraformSet.has("WATER")) {
        return fail("Requires LAND + WATER on your planet.", "COLONIZE_REQ_PLANT");
      }
      return { ok: true };
    case "ANIMAL":
      return colonizeSet.has("PLANT") ? { ok: true } : fail("Requires PLANT before ANIMAL.", "COLONIZE_REQ_ANIMAL");
    case "SENTIENT":
      return colonizeSet.has("ANIMAL") ? { ok: true } : fail("Requires ANIMAL before SENTIENT.", "COLONIZE_REQ_SENTIENT");
    case "HIGH_TECH": {
      if (!colonizeSet.has("SENTIENT")) {
        return fail("Requires SENTIENT before HIGH TECH.", "COLONIZE_REQ_HIGHTECH_SENTIENT");
      }
      if (terraformSet.size < 3) {
        return fail("Requires 3 different Terraform types.", "COLONIZE_REQ_HIGHTECH_TERRAFORM");
      }
      return { ok: true };
    }
  }
}

export function validateIntent(state: GameState, intent: ActionIntent, ctx: ValidationContext): ValidationResult {
  if (intent.type === "LOAD_STATE" || intent.type === "REPLAY_FROM_START") {
    return { ok: true };
  }

  if (intent.type === "UNDO") {
    return ctx.hasUndoHistory ? { ok: true } : fail("Nothing to undo.", "UNDO_EMPTY");
  }

  if (requiresDiscard(state, ctx) && intent.type !== "DISCARD_FROM_HAND") {
    return fail(`Discard down to ${ctx.handSizeLimit} first.`, "DISCARD_REQUIRED");
  }

  if (intent.type === "DRAW_2" && state.phase !== "DRAW") {
    return fail("Only available during Draw.", "PHASE_DRAW_ONLY");
  }

  if ((intent.type === "PLAY_TERRAFORM" || intent.type === "PLAY_COLONIZE" || intent.type === "PLAY_IMPACT") && state.phase !== "PLAY") {
    return fail("Only available during Play.", "PHASE_PLAY_ONLY");
  }

  if (intent.type === "END_PLAY" && state.phase !== "PLAY") {
    return fail("Only available during Play.", "PHASE_PLAY_ONLY");
  }

  if (intent.type === "ADVANCE") {
    if (state.phase === "RESOLVE" || state.phase === "CHECK_WIN") {
      return { ok: true };
    }
    return state.phase === "PLAY"
      ? fail("End Play first.", "ADVANCE_END_PLAY_FIRST")
      : fail("Only available after End Play.", "ADVANCE_PHASE_INVALID");
  }

  if (intent.type === "DISCARD_FROM_HAND") {
    return validateHandIndex(state, intent.handIndex, ctx.activePlayer);
  }

  if (intent.type === "PLAY_TERRAFORM" || intent.type === "PLAY_COLONIZE") {
    if (ctx.playsRemaining <= 0) {
      return fail("No plays remaining.", "PLAYS_EMPTY");
    }
  }

  if (intent.type === "PLAY_IMPACT") {
    if (ctx.playsRemaining <= 0) {
      return fail("No plays remaining.", "PLAYS_EMPTY");
    }
    if (ctx.impactsRemaining <= 0) {
      return fail("No impacts remaining.", "IMPACTS_EMPTY");
    }
  }

  if (intent.type === "GAS_REDRAW") {
    if (state.phase !== "PLAY") return fail("Only available during Play.", "PHASE_PLAY_ONLY");
    if (!ctx.abilitiesEnabled(ctx.activePlayer)) return fail("Abilities disabled (Solar Flare).", "ABILITIES_DISABLED");
    const player = state.players[ctx.activePlayer];
    if (player.planet.core !== "GAS") return fail("Gas Redraw is only available with a GAS core.", "CORE_NOT_GAS");
    if (player.abilities.gas_redraw_used_turn) return fail("Gas Redraw already used this turn.", "GAS_REDRAW_USED");
    return validateHandIndex(state, intent.handIndex, ctx.activePlayer);
  }

  if (intent.type === "WATER_SWAP") {
    if (state.phase !== "PLAY") return fail("Only available during Play.", "PHASE_PLAY_ONLY");
    if (!ctx.abilitiesEnabled(ctx.activePlayer)) return fail("Abilities disabled (Solar Flare).", "ABILITIES_DISABLED");
    const player = state.players[ctx.activePlayer];
    if (player.planet.core !== "WATER") return fail("Water Swap is only available with a WATER core.", "CORE_NOT_WATER");
    if (player.abilities.water_swap_used_turn) return fail("Water Swap already used this turn.", "WATER_SWAP_USED");

    const { a, b } = intent;
    if (a === b) return fail("Choose two different slots.", "WATER_SWAP_SAME_SLOT");
    if (a < 0 || a >= player.planet.slots.length || b < 0 || b >= player.planet.slots.length) {
      return fail("Invalid slot selection.", "SLOT_INDEX_INVALID");
    }
    if (player.planet.locked[a] || player.planet.locked[b]) {
      return fail("That slot is locked.", "SLOT_LOCKED");
    }
    const slotA = player.planet.slots[a];
    const slotB = player.planet.slots[b];
    if (slotA?.kind !== "TERRAFORM" || slotB?.kind !== "TERRAFORM") {
      return fail("Water Swap requires two Terraform slots.", "WATER_SWAP_REQUIRES_TERRAFORM");
    }
    return { ok: true };
  }

  if (intent.type === "END_PLAY") {
    return { ok: true };
  }

  if (intent.type === "PLAY_TERRAFORM" || intent.type === "PLAY_COLONIZE" || intent.type === "PLAY_IMPACT") {
    const handResult = validateHandIndex(state, intent.handIndex, ctx.activePlayer);
    if (!handResult.ok) return handResult;
    const orb = state.players[ctx.activePlayer].hand[intent.handIndex];

    if (intent.type === "PLAY_TERRAFORM") {
      if (!orb || orb.kind !== "TERRAFORM") return fail("Invalid hand selection.", "HAND_ORB_MISMATCH");
      if (ctx.activePlayer !== state.active) return fail("Not your turn.", "NOT_ACTIVE_PLAYER");
      if (state.players[ctx.activePlayer].planet.core === "GAS" && orb.t === "ICE") {
        return fail("Gas cores cannot place ICE terraform.", "GAS_NO_ICE");
      }
      if (intent.slotIndex < 0 || intent.slotIndex >= state.players[ctx.activePlayer].planet.slots.length) {
        return fail("Invalid slot selection.", "SLOT_INDEX_INVALID");
      }
      if (state.players[ctx.activePlayer].planet.locked[intent.slotIndex]) {
        return fail("That slot is locked.", "SLOT_LOCKED");
      }
      if (state.players[ctx.activePlayer].planet.slots[intent.slotIndex] !== null) {
        return fail("That slot is occupied.", "SLOT_OCCUPIED");
      }
      if (!canPlaceTerraform(state, ctx.activePlayer, intent.slotIndex)) {
        return fail("No valid slots available.", "NO_VALID_TERRAFORM_SLOT");
      }
      return { ok: true };
    }

    if (intent.type === "PLAY_COLONIZE") {
      if (!orb || orb.kind !== "COLONIZE") return fail("Invalid hand selection.", "HAND_ORB_MISMATCH");
      const requirement = validateColonizeRequirement(state, ctx.activePlayer, orb);
      if (!requirement.ok) return requirement;
      if (intent.slotIndex < 0 || intent.slotIndex >= state.players[ctx.activePlayer].planet.slots.length) {
        return fail("Invalid slot selection.", "SLOT_INDEX_INVALID");
      }
      if (state.players[ctx.activePlayer].planet.locked[intent.slotIndex]) {
        return fail("That slot is locked.", "SLOT_LOCKED");
      }
      if (state.players[ctx.activePlayer].planet.slots[intent.slotIndex] !== null) {
        return fail("That slot is occupied.", "SLOT_OCCUPIED");
      }
      if (!canPlaceColonize(state, ctx.activePlayer, orb.c, intent.slotIndex)) {
        return fail("No valid slots available.", "NO_VALID_COLONIZE_SLOT");
      }
      return { ok: true };
    }

    if (!orb || orb.kind !== "IMPACT") return fail("Invalid hand selection.", "HAND_ORB_MISMATCH");
    if (intent.target !== 0 && intent.target !== 1) {
      return fail("Invalid impact target.", "IMPACT_TARGET_INVALID");
    }
    return { ok: true };
  }

  return { ok: true };
}

export function reasonForDisabledOrb(
  state: GameState,
  orb: Orb,
  ctx: ValidationContext & { handIndex?: number; preferredImpactTarget?: 0 | 1 }
): string | null {
  const handIndex =
    ctx.handIndex ??
    state.players[ctx.activePlayer].hand.findIndex((candidate) => candidate === orb);

  if (handIndex < 0) {
    return "Invalid hand selection.";
  }

  if (orb.kind === "IMPACT") {
    const target = ctx.preferredImpactTarget ?? (ctx.activePlayer === 0 ? 1 : 0);
    const result = validateIntent(state, { type: "PLAY_IMPACT", handIndex, target }, ctx);
    return result.ok ? null : result.reason;
  }

  const slotCount = state.players[ctx.activePlayer].planet.slots.length;
  const intents = Array.from({ length: slotCount }, (_v, slotIndex) =>
    orb.kind === "TERRAFORM"
      ? ({ type: "PLAY_TERRAFORM", handIndex, slotIndex } as const)
      : ({ type: "PLAY_COLONIZE", handIndex, slotIndex } as const)
  );

  let firstReason: string | null = null;
  for (const intent of intents) {
    const result = validateIntent(state, intent, ctx);
    if (result.ok) return null;
    if (!firstReason) firstReason = result.reason;
  }

  return firstReason;
}

export const DEFAULT_HAND_SIZE_LIMIT = HAND_CAP;
