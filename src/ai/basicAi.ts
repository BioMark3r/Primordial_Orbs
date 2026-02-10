import type { GameState, Impact } from "../engine/types";
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

function scoreColonizeMove(state: GameState, player: 0 | 1, move: Placement): number {
  const handOrb = state.players[player].hand[move.handIndex];
  if (!handOrb || handOrb.kind !== "COLONIZE") return Number.NEGATIVE_INFINITY;

  const progress = computeProgressFromPlanet(state.players[player].planet.slots);
  let score = 0;

  if (!progress.unlocked[handOrb.c]) {
    score += 3;
  }

  const chainBonus: Record<typeof handOrb.c, number> = {
    PLANT: 1,
    ANIMAL: progress.unlocked.PLANT ? 1 : 0,
    SENTIENT: progress.unlocked.ANIMAL ? 1 : 0,
    HIGH_TECH: progress.unlocked.SENTIENT ? 1 : 0,
  };

  score += chainBonus[handOrb.c];
  return score;
}

function pickTerraformPlacement(state: GameState, player: 0 | 1, placements: Placement[]): Placement | null {
  if (placements.length === 0) return null;

  const terraformCounts: Record<string, number> = {};
  state.players[player].planet.slots.forEach((slot) => {
    if (slot?.kind === "TERRAFORM") {
      terraformCounts[slot.t] = (terraformCounts[slot.t] ?? 0) + 1;
    }
  });

  const sorted = [...placements].sort((a, b) => {
    const orbA = state.players[player].hand[a.handIndex];
    const orbB = state.players[player].hand[b.handIndex];
    const countA = orbA?.kind === "TERRAFORM" ? terraformCounts[orbA.t] ?? 0 : 0;
    const countB = orbB?.kind === "TERRAFORM" ? terraformCounts[orbB.t] ?? 0 : 0;
    if (countA !== countB) return countA - countB;
    return a.handIndex - b.handIndex;
  });

  return sorted[0] ?? null;
}

function pickImpact(impacts: ImpactPlay[]): ImpactPlay | null {
  if (impacts.length === 0) return null;
  const rank: Record<Impact, number> = {
    BLACK_HOLE: 0,
    TEMPORAL_VORTEX: 1,
    DISEASE: 2,
    SOLAR_FLARE: 3,
    QUAKE: 4,
    METEOR: 5,
    TORNADO: 6,
  };
  return [...impacts].sort((a, b) => rank[a.impact] - rank[b.impact])[0] ?? null;
}

export function chooseNextIntentEasy(state: GameState, aiPlayer: 0 | 1): ActionIntent | null {
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
    const terraformPlacements = listValidTerraformPlacements(state, aiPlayer);
    const colonizePlacements = listValidColonizePlacements(state, aiPlayer);
    const opponent = aiPlayer === 0 ? 1 : 0;
    const impacts = listValidImpacts(state, aiPlayer, opponent);

    const bestColonize = [...colonizePlacements]
      .sort((a, b) => scoreColonizeMove(state, aiPlayer, b) - scoreColonizeMove(state, aiPlayer, a))[0] ?? null;
    if (bestColonize) {
      return { type: "PLAY_COLONIZE", handIndex: bestColonize.handIndex, slotIndex: bestColonize.slotIndex };
    }

    const terraformOnPlanet = state.players[aiPlayer].planet.slots.filter((slot) => slot?.kind === "TERRAFORM").length;
    if (terraformOnPlanet <= 3) {
      const terraform = pickTerraformPlacement(state, aiPlayer, terraformPlacements);
      if (terraform) {
        return { type: "PLAY_TERRAFORM", handIndex: terraform.handIndex, slotIndex: terraform.slotIndex };
      }
    }

    if (state.counters.impactsRemaining > 0 && impacts.length > 0 && Math.random() < 0.4) {
      const impact = pickImpact(impacts);
      if (impact) {
        return { type: "PLAY_IMPACT", handIndex: impact.handIndex, target: impact.target };
      }
    }

    const terraform = pickTerraformPlacement(state, aiPlayer, terraformPlacements);
    if (terraform) {
      return { type: "PLAY_TERRAFORM", handIndex: terraform.handIndex, slotIndex: terraform.slotIndex };
    }

    if (impacts.length > 0) {
      const impact = pickImpact(impacts);
      if (impact) {
        return { type: "PLAY_IMPACT", handIndex: impact.handIndex, target: impact.target };
      }
    }

    return validateIntent(state, { type: "END_PLAY" }, ctx).ok ? { type: "END_PLAY" } : null;
  }

  if ((state.phase === "RESOLVE" || state.phase === "CHECK_WIN") && validateIntent(state, { type: "ADVANCE" }, ctx).ok) {
    return { type: "ADVANCE" };
  }

  return null;
}
