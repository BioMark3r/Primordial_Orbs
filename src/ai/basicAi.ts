import type { GameState, Impact } from "../engine/types";
import type { AiPersonality } from "./aiTypes";
import { computeProgressFromPlanet } from "../ui/utils/progress";
import {
  DEFAULT_HAND_SIZE_LIMIT,
  validateIntent,
  type ActionIntent,
  type ValidationContext,
} from "../ui/utils/actionValidation";

type Placement = { handIndex: number; slotIndex: number };

type ImpactPlay = { handIndex: number; target: 0 | 1; impact: Impact };

function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}

function buildValidationContext(state: GameState, player: 0 | 1): ValidationContext {
  return {
    activePlayer: player,
    playsRemaining: state.counters.playsRemaining,
    impactsRemaining: state.counters.impactsRemaining,
    abilitiesEnabled: (p: 0 | 1) => abilitiesEnabled(state, p),
    handSizeLimit: DEFAULT_HAND_SIZE_LIMIT,
  };
}

export function findEmptySlots(state: GameState, player: 0 | 1): number[] {
  const planet = state.players[player].planet;
  return planet.slots.flatMap((slot, slotIndex) => (!planet.locked[slotIndex] && slot === null ? [slotIndex] : []));
}

export function listValidTerraformPlacements(state: GameState, player: 0 | 1): Placement[] {
  const ctx = buildValidationContext(state, player);
  const hand = state.players[player].hand;
  const emptySlots = findEmptySlots(state, player);
  const moves: Placement[] = [];

  hand.forEach((orb, handIndex) => {
    if (orb.kind !== "TERRAFORM") return;
    emptySlots.forEach((slotIndex) => {
      const intent: ActionIntent = { type: "PLAY_TERRAFORM", handIndex, slotIndex };
      if (validateIntent(state, intent, ctx).ok) {
        moves.push({ handIndex, slotIndex });
      }
    });
  });

  return moves;
}

export function listValidColonizePlacements(state: GameState, player: 0 | 1): Placement[] {
  const ctx = buildValidationContext(state, player);
  const hand = state.players[player].hand;
  const emptySlots = findEmptySlots(state, player);
  const moves: Placement[] = [];

  hand.forEach((orb, handIndex) => {
    if (orb.kind !== "COLONIZE") return;
    emptySlots.forEach((slotIndex) => {
      const intent: ActionIntent = { type: "PLAY_COLONIZE", handIndex, slotIndex };
      if (validateIntent(state, intent, ctx).ok) {
        moves.push({ handIndex, slotIndex });
      }
    });
  });

  return moves;
}

export function listValidImpacts(state: GameState, player: 0 | 1, target: 0 | 1): ImpactPlay[] {
  const ctx = buildValidationContext(state, player);
  const hand = state.players[player].hand;
  const impacts: ImpactPlay[] = [];

  hand.forEach((orb, handIndex) => {
    if (orb.kind !== "IMPACT") return;
    const intent: ActionIntent = { type: "PLAY_IMPACT", handIndex, target };
    if (validateIntent(state, intent, ctx).ok) {
      impacts.push({ handIndex, target, impact: orb.i });
    }
  });

  return impacts;
}

function pickDiscardIndex(state: GameState, player: 0 | 1): number | null {
  const hand = state.players[player].hand;
  if (hand.length <= DEFAULT_HAND_SIZE_LIMIT) return null;

  const noImpactsLeft = state.counters.impactsRemaining <= 0;
  if (noImpactsLeft) {
    const impactIndex = hand.findIndex((orb) => orb.kind === "IMPACT");
    if (impactIndex >= 0) return impactIndex;
  }

  const terraformCounts: Record<string, number> = {};
  state.players[player].planet.slots.forEach((slot) => {
    if (slot?.kind === "TERRAFORM") {
      terraformCounts[slot.t] = (terraformCounts[slot.t] ?? 0) + 1;
    }
  });

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  hand.forEach((orb, index) => {
    let score = 0;
    if (orb.kind === "TERRAFORM") score = terraformCounts[orb.t] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex >= 0 ? bestIndex : 0;
}

type Weights = {
  unlockColonize: number;
  anyColonize: number;
  terraformSafety: number;
  terraformGeneral: number;
  impactPlay: number;
  endPlay: number;
};

const IMPACT_STRENGTH_BONUS: Record<Impact, number> = {
  BLACK_HOLE: 5,
  TEMPORAL_VORTEX: 4,
  SOLAR_FLARE: 3,
  DISEASE: 3,
  QUAKE: 2,
  METEOR: 2,
  TORNADO: 1,
};

type Candidate = { intent: ActionIntent; score: number; priority: number };

export function weightsFor(personality: AiPersonality): Weights {
  if (personality === "BUILDER") {
    return {
      unlockColonize: 10,
      anyColonize: 6,
      terraformSafety: 9,
      terraformGeneral: 7,
      impactPlay: 3,
      endPlay: 1,
    };
  }
  if (personality === "AGGRESSIVE") {
    return {
      unlockColonize: 7,
      anyColonize: 3,
      terraformSafety: 6,
      terraformGeneral: 4,
      impactPlay: 10,
      endPlay: 1,
    };
  }
  return {
    unlockColonize: 9,
    anyColonize: 4,
    terraformSafety: 8,
    terraformGeneral: 5,
    impactPlay: 6,
    endPlay: 1,
  };
}

export function chooseNextIntentEasy(
  state: GameState,
  aiPlayer: 0 | 1,
  personality: AiPersonality,
): ActionIntent | null {
  const ctx = buildValidationContext(state, aiPlayer);

  if (state.active !== aiPlayer || state.phase === "GAME_OVER") return null;

  if (state.phase === "DRAW") {
    return validateIntent(state, { type: "DRAW_2" }, ctx).ok ? { type: "DRAW_2" } : null;
  }

  if (state.phase === "PLAY" && state.players[aiPlayer].hand.length > DEFAULT_HAND_SIZE_LIMIT) {
    const discardIndex = pickDiscardIndex(state, aiPlayer);
    if (discardIndex !== null) {
      const discardIntent: ActionIntent = { type: "DISCARD_FROM_HAND", handIndex: discardIndex };
      if (validateIntent(state, discardIntent, ctx).ok) {
        return discardIntent;
      }
    }
  }

  if (state.phase === "PLAY") {
    const weights = weightsFor(personality);
    const terraformPlacements = listValidTerraformPlacements(state, aiPlayer);
    const colonizePlacements = listValidColonizePlacements(state, aiPlayer);
    const opponent = aiPlayer === 0 ? 1 : 0;
    const impacts = listValidImpacts(state, aiPlayer, opponent);
    const progress = computeProgressFromPlanet(state.players[aiPlayer].planet.slots);
    const terraformOnPlanet = state.players[aiPlayer].planet.slots.filter((slot) => slot?.kind === "TERRAFORM").length;
    const terraformMinimum = 3;
    const candidates: Candidate[] = [];

    colonizePlacements.forEach((move) => {
      const handOrb = state.players[aiPlayer].hand[move.handIndex];
      if (!handOrb || handOrb.kind !== "COLONIZE") return;
      const unlocksNewType = !progress.unlocked[handOrb.c];
      const jitter = unlocksNewType ? state.turn % 3 : 0;
      candidates.push({
        intent: { type: "PLAY_COLONIZE", handIndex: move.handIndex, slotIndex: move.slotIndex },
        score: (unlocksNewType ? weights.unlockColonize : weights.anyColonize) + jitter,
        priority: 3,
      });
    });

    terraformPlacements.forEach((move) => {
      candidates.push({
        intent: { type: "PLAY_TERRAFORM", handIndex: move.handIndex, slotIndex: move.slotIndex },
        score: terraformOnPlanet <= terraformMinimum ? weights.terraformSafety : weights.terraformGeneral,
        priority: 1,
      });
    });

    impacts.forEach((move) => {
      candidates.push({
        intent: { type: "PLAY_IMPACT", handIndex: move.handIndex, target: move.target },
        score: weights.impactPlay + IMPACT_STRENGTH_BONUS[move.impact],
        priority: 2,
      });
    });

    if (validateIntent(state, { type: "END_PLAY" }, ctx).ok) {
      candidates.push({ intent: { type: "END_PLAY" }, score: weights.endPlay, priority: 0 });
    }

    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.intent.type !== b.intent.type) return a.intent.type.localeCompare(b.intent.type);
        if ("handIndex" in a.intent && "handIndex" in b.intent && a.intent.handIndex !== b.intent.handIndex) {
          return a.intent.handIndex - b.intent.handIndex;
        }
        if ("slotIndex" in a.intent && "slotIndex" in b.intent && a.intent.slotIndex !== b.intent.slotIndex) {
          return a.intent.slotIndex - b.intent.slotIndex;
        }
        return 0;
      })[0];
      return best?.intent ?? null;
    }

    if (validateIntent(state, { type: "END_PLAY" }, ctx).ok) {
      return { type: "END_PLAY" };
    }

    return validateIntent(state, { type: "ADVANCE" }, ctx).ok ? { type: "ADVANCE" } : null;
  }

  if ((state.phase === "RESOLVE" || state.phase === "CHECK_WIN") && validateIntent(state, { type: "ADVANCE" }, ctx).ok) {
    return { type: "ADVANCE" };
  }

  return null;
}
