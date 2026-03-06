import { reducer } from "../engine/reducer";
import type { Action, GameState, Impact } from "../engine/types";
import type { AiDifficulty, AiPersonality } from "./aiTypes";
import { computeProgressFromPlanet } from "../ui/utils/progress";
import {
  DEFAULT_HAND_SIZE_LIMIT,
  validateIntent,
  type ActionIntent,
  type ValidationContext,
} from "../ui/utils/actionValidation";

type Placement = { handIndex: number; slotIndex: number };
type ImpactPlay = { handIndex: number; target: 0 | 1; impact: Impact };
type Candidate = { intent: ActionIntent; score: number; priority: number };

type Weights = {
  unlockColonize: number;
  anyColonize: number;
  terraformSafety: number;
  terraformGeneral: number;
  impactPlay: number;
  lowStabilityDefense: number;
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
      if (validateIntent(state, intent, ctx).ok) moves.push({ handIndex, slotIndex });
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
      if (validateIntent(state, intent, ctx).ok) moves.push({ handIndex, slotIndex });
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
    if (validateIntent(state, intent, ctx).ok) impacts.push({ handIndex, target, impact: orb.i });
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
    if (slot?.kind === "TERRAFORM") terraformCounts[slot.t] = (terraformCounts[slot.t] ?? 0) + 1;
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

function chooseRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function intentToAction(intent: ActionIntent): Action | null {
  switch (intent.type) {
    case "DRAW_2":
    case "END_PLAY":
    case "ADVANCE":
      return intent;
    case "DISCARD_FROM_HAND":
      return { type: "DISCARD_FROM_HAND", index: intent.handIndex };
    case "PLAY_TERRAFORM":
    case "PLAY_COLONIZE":
    case "PLAY_IMPACT":
      return intent;
    case "WATER_SWAP":
      return { type: "WATER_SWAP", slotA: intent.a, slotB: intent.b };
    case "GAS_REDRAW":
      return intent;
    default:
      return null;
  }
}

function scoreStateAfterMove(before: GameState, after: GameState, aiPlayer: 0 | 1): number {
  const opponent = aiPlayer === 0 ? 1 : 0;
  const beforeSelf = before.players[aiPlayer];
  const afterSelf = after.players[aiPlayer];
  const beforeOpp = before.players[opponent];
  const afterOpp = after.players[opponent];

  const terraformDelta =
    afterSelf.planet.slots.filter((s) => s?.kind === "TERRAFORM").length -
    beforeSelf.planet.slots.filter((s) => s?.kind === "TERRAFORM").length;
  const colonizeDelta =
    afterSelf.planet.slots.filter((s) => s?.kind === "COLONIZE").length -
    beforeSelf.planet.slots.filter((s) => s?.kind === "COLONIZE").length;

  const progressBefore = computeProgressFromPlanet(beforeSelf.planet.slots);
  const progressAfter = computeProgressFromPlanet(afterSelf.planet.slots);
  const unlockedBefore = Object.values(progressBefore.unlocked).filter(Boolean).length;
  const unlockedAfter = Object.values(progressAfter.unlocked).filter(Boolean).length;

  const instabilityGain = beforeOpp.instability_strikes - afterOpp.instability_strikes;
  const vulnerabilityGain = beforeOpp.vulnerability - afterOpp.vulnerability;
  const selfDanger = afterSelf.vulnerability + afterSelf.instability_strikes;

  return (
    terraformDelta * 3 +
    colonizeDelta * 8 +
    (unlockedAfter - unlockedBefore) * 6 +
    instabilityGain * 10 +
    vulnerabilityGain * 3 -
    selfDanger * 2
  );
}

export function weightsFor(personality: AiPersonality): Weights {
  if (personality === "BUILDER") {
    return {
      unlockColonize: 10,
      anyColonize: 6,
      terraformSafety: 9,
      terraformGeneral: 7,
      impactPlay: 3,
      lowStabilityDefense: 9,
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
      lowStabilityDefense: 4,
      endPlay: 1,
    };
  }
  return {
    unlockColonize: 9,
    anyColonize: 4,
    terraformSafety: 8,
    terraformGeneral: 5,
    impactPlay: 6,
    lowStabilityDefense: 6,
    endPlay: 1,
  };
}

function scoreMove(state: GameState, aiPlayer: 0 | 1, move: ActionIntent, personality: AiPersonality, hardLookahead = false): number {
  const weights = weightsFor(personality);
  const self = state.players[aiPlayer];
  const progress = computeProgressFromPlanet(self.planet.slots);
  const terraformOnPlanet = self.planet.slots.filter((slot) => slot?.kind === "TERRAFORM").length;
  const defensiveMode = self.instability_strikes >= 1 || self.vulnerability >= 2;

  let score = 0;
  if (move.type === "PLAY_COLONIZE") {
    const handOrb = self.hand[move.handIndex];
    if (handOrb?.kind === "COLONIZE") {
      score += !progress.unlocked[handOrb.c] ? weights.unlockColonize : weights.anyColonize;
    }
    score += 4;
  }

  if (move.type === "PLAY_TERRAFORM") {
    score += terraformOnPlanet <= 3 ? weights.terraformSafety : weights.terraformGeneral;
    if (defensiveMode) score += weights.lowStabilityDefense;
  }

  if (move.type === "PLAY_IMPACT") {
    const handOrb = self.hand[move.handIndex];
    if (handOrb?.kind === "IMPACT") score += weights.impactPlay + IMPACT_STRENGTH_BONUS[handOrb.i];
    if (move.target !== aiPlayer) score += 3;
    if (defensiveMode && move.target === aiPlayer) score -= 2;
  }

  if (move.type === "END_PLAY") score += weights.endPlay;

  const action = intentToAction(move);
  if (action) {
    const after = reducer(state, action);
    score += scoreStateAfterMove(state, after, aiPlayer);
    if (hardLookahead) {
      const pressure = after.players[aiPlayer].vulnerability + after.players[aiPlayer].instability_strikes;
      score -= pressure * 1.5;
    }
  }

  return score;
}

function rankCandidates(state: GameState, aiPlayer: 0 | 1, personality: AiPersonality, hardLookahead = false): Candidate[] {
  const ctx = buildValidationContext(state, aiPlayer);
  const terraformPlacements = listValidTerraformPlacements(state, aiPlayer);
  const colonizePlacements = listValidColonizePlacements(state, aiPlayer);
  const opponent = aiPlayer === 0 ? 1 : 0;
  const impacts = listValidImpacts(state, aiPlayer, opponent);
  const candidates: Candidate[] = [];

  colonizePlacements.forEach((move) => {
    const intent: ActionIntent = { type: "PLAY_COLONIZE", handIndex: move.handIndex, slotIndex: move.slotIndex };
    candidates.push({ intent, score: scoreMove(state, aiPlayer, intent, personality, hardLookahead), priority: 3 });
  });

  terraformPlacements.forEach((move) => {
    const intent: ActionIntent = { type: "PLAY_TERRAFORM", handIndex: move.handIndex, slotIndex: move.slotIndex };
    candidates.push({ intent, score: scoreMove(state, aiPlayer, intent, personality, hardLookahead), priority: 1 });
  });

  impacts.forEach((move) => {
    const intent: ActionIntent = { type: "PLAY_IMPACT", handIndex: move.handIndex, target: move.target };
    candidates.push({ intent, score: scoreMove(state, aiPlayer, intent, personality, hardLookahead), priority: 2 });
  });

  if (validateIntent(state, { type: "END_PLAY" }, ctx).ok) {
    const intent: ActionIntent = { type: "END_PLAY" };
    candidates.push({ intent, score: scoreMove(state, aiPlayer, intent, personality, hardLookahead), priority: 0 });
  }

  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.intent.type !== b.intent.type) return a.intent.type.localeCompare(b.intent.type);
    if ("handIndex" in a.intent && "handIndex" in b.intent && a.intent.handIndex !== b.intent.handIndex) {
      return a.intent.handIndex - b.intent.handIndex;
    }
    return 0;
  });
}

export function chooseNextIntentEasy(state: GameState, aiPlayer: 0 | 1): ActionIntent | null {
  const ctx = buildValidationContext(state, aiPlayer);
  if (state.active !== aiPlayer || state.phase === "GAME_OVER") return null;

  if (state.phase === "DRAW") {
    return validateIntent(state, { type: "DRAW_2" }, ctx).ok ? { type: "DRAW_2" } : null;
  }

  if (state.phase === "PLAY" && state.players[aiPlayer].hand.length > DEFAULT_HAND_SIZE_LIMIT) {
    const discardIndex = pickDiscardIndex(state, aiPlayer);
    if (discardIndex !== null) return { type: "DISCARD_FROM_HAND", handIndex: discardIndex };
  }

  if (state.phase === "PLAY") {
    const moves = rankCandidates(state, aiPlayer, "BALANCED", false)
      .map((candidate) => candidate.intent)
      .filter((intent) => intent.type !== "END_PLAY");
    const randomMove = chooseRandom(moves);
    if (randomMove) return randomMove;
    if (validateIntent(state, { type: "END_PLAY" }, ctx).ok) return { type: "END_PLAY" };
    return validateIntent(state, { type: "ADVANCE" }, ctx).ok ? { type: "ADVANCE" } : null;
  }

  if ((state.phase === "RESOLVE" || state.phase === "CHECK_WIN") && validateIntent(state, { type: "ADVANCE" }, ctx).ok) {
    return { type: "ADVANCE" };
  }

  return null;
}

function chooseHeuristicMove(
  state: GameState,
  aiPlayer: 0 | 1,
  personality: AiPersonality,
  hardLookahead: boolean,
): ActionIntent | null {
  const ctx = buildValidationContext(state, aiPlayer);
  if (state.phase !== "PLAY") return null;

  const ranked = rankCandidates(state, aiPlayer, personality, hardLookahead);
  if (ranked.length === 0) {
    if (validateIntent(state, { type: "END_PLAY" }, ctx).ok) return { type: "END_PLAY" };
    return validateIntent(state, { type: "ADVANCE" }, ctx).ok ? { type: "ADVANCE" } : null;
  }

  const topScore = ranked[0].score;
  const topMoves = ranked.filter((candidate) => topScore - candidate.score <= 1.5).slice(0, 3);
  const picked = hardLookahead ? topMoves[0] : chooseRandom(topMoves) ?? topMoves[0];
  return picked?.intent ?? null;
}

export function chooseNextIntentByDifficulty(
  state: GameState,
  aiPlayer: 0 | 1,
  personality: AiPersonality,
  difficulty: AiDifficulty,
): ActionIntent | null {
  const ctx = buildValidationContext(state, aiPlayer);
  if (state.active !== aiPlayer || state.phase === "GAME_OVER") return null;

  if (state.phase === "DRAW") {
    return validateIntent(state, { type: "DRAW_2" }, ctx).ok ? { type: "DRAW_2" } : null;
  }

  if (state.phase === "PLAY" && state.players[aiPlayer].hand.length > DEFAULT_HAND_SIZE_LIMIT) {
    const discardIndex = pickDiscardIndex(state, aiPlayer);
    if (discardIndex !== null) return { type: "DISCARD_FROM_HAND", handIndex: discardIndex };
  }

  if (difficulty === "EASY") return chooseNextIntentEasy(state, aiPlayer);
  if (difficulty === "HARD") return chooseHeuristicMove(state, aiPlayer, personality, true);

  const normalMove = chooseHeuristicMove(state, aiPlayer, personality, false);
  if (normalMove) return normalMove;

  if ((state.phase === "RESOLVE" || state.phase === "CHECK_WIN") && validateIntent(state, { type: "ADVANCE" }, ctx).ok) {
    return { type: "ADVANCE" };
  }

  return null;
}
