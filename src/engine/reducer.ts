import type { Action, GameState, Orb } from "./types";
import { DRAW_N, HAND_CAP, IMPACT_CAP, PLAY_CAP } from "./constants";
import { newGame } from "./setup";
import { canPlaceColonize, canPlaceTerraform, colonizeCount, isHandOverflow } from "./rules";
import { applyImpactDeterministic, markInstabilityIfNeeded, resetRoundFlags } from "./impacts";

function pushLog(state: GameState, msg: string): GameState {
  return { ...state, log: [msg, ...state.log].slice(0, 200) };
}

function drawOne(state: GameState): { state: GameState; orb?: Orb } {
  if (state.bag.length === 0) return { state };
  const orb = state.bag[state.bag.length - 1];
  return { state: { ...state, bag: state.bag.slice(0, -1) }, orb };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "NEW_GAME":
      return newGame(action.mode, action.coreP0, action.coreP1, action.seed ?? Date.now());

    case "DRAW_2": {
      if (state.phase !== "DRAW") return state;
      let next = state;

      const p = state.active;
      const hand = [...state.players[p].hand];

      for (let i = 0; i < DRAW_N; i++) {
        const r = drawOne(next);
        next = r.state;
        if (!r.orb) break;
        hand.push(r.orb);
      }

      const players = [...next.players] as GameState["players"];
      players[p] = { ...players[p], hand };
      next = { ...next, players };
      next = pushLog(next, `P${p} drew ${DRAW_N}. Hand: ${hand.length}/${HAND_CAP}.`);

      if (isHandOverflow(hand)) return next; // must discard; stay in DRAW
      return { ...next, phase: "PLAY" };
    }

    case "DISCARD_FROM_HAND": {
      const p = state.active;
      const hand = [...state.players[p].hand];
      if (action.index < 0 || action.index >= hand.length) return state;
      const [removed] = hand.splice(action.index, 1);

      const players = [...state.players] as GameState["players"];
      players[p] = { ...players[p], hand };
      let next = pushLog({ ...state, players, discard: [...state.discard, removed] }, `P${p} discarded 1 orb.`);

      if (!isHandOverflow(hand)) next = { ...next, phase: "PLAY" };
      return next;
    }

    case "PLAY_TERRAFORM": {
      if (state.phase !== "PLAY") return state;
      if (state.counters.playsRemaining <= 0) return state;

      const p = state.active;
      const hand = [...state.players[p].hand];
      const orb = hand[action.handIndex];
      if (!orb || orb.kind !== "TERRAFORM") return state;
      if (!canPlaceTerraform(state, p, action.slotIndex)) return state;

      hand.splice(action.handIndex, 1);
      const planet = { ...state.players[p].planet };
      const slots = [...planet.slots];
      slots[action.slotIndex] = orb;

      const players = [...state.players] as GameState["players"];
      players[p] = { ...state.players[p], hand, planet: { ...planet, slots } };

      return pushLog(
        { ...state, players, counters: { ...state.counters, playsRemaining: state.counters.playsRemaining - 1 } },
        `P${p} terraformed ${orb.t} → slot ${action.slotIndex}.`
      );
    }

    case "PLAY_COLONIZE": {
      if (state.phase !== "PLAY") return state;
      if (state.counters.playsRemaining <= 0) return state;

      const p = state.active;
      const hand = [...state.players[p].hand];
      const orb = hand[action.handIndex];
      if (!orb || orb.kind !== "COLONIZE") return state;
      if (!canPlaceColonize(state, p, orb.c, action.slotIndex)) return state;

      hand.splice(action.handIndex, 1);
      const planet = { ...state.players[p].planet };
      const slots = [...planet.slots];
      slots[action.slotIndex] = orb;

      const players = [...state.players] as GameState["players"];
      players[p] = { ...state.players[p], hand, planet: { ...planet, slots } };

      const newVuln = colonizeCount({ ...state, players }, p);
      players[p] = { ...players[p], vulnerability: newVuln };

      return pushLog(
        { ...state, players, counters: { ...state.counters, playsRemaining: state.counters.playsRemaining - 1 } },
        `P${p} colonized ${orb.c}. Vulnerability +${newVuln}.`
      );
    }

    case "PLAY_IMPACT": {
      if (state.phase !== "PLAY") return state;
      if (state.counters.playsRemaining <= 0) return state;
      if (state.counters.impactsRemaining <= 0) return state;

      const p = state.active;
      const target: 0 | 1 = p === 0 ? 1 : 0;

      const hand = [...state.players[p].hand];
      const orb = hand[action.handIndex];
      if (!orb || orb.kind !== "IMPACT") return state;

      hand.splice(action.handIndex, 1);

      const players = [...state.players] as GameState["players"];
      players[p] = { ...state.players[p], hand };

      let next = pushLog({ ...state, players }, `P${p} played impact ${orb.i} → P${target}.`);
      next = applyImpactDeterministic(next, orb.i, p, target);

      next = {
        ...next,
        counters: {
          playsRemaining: next.counters.playsRemaining - 1,
          impactsRemaining: next.counters.impactsRemaining - 1,
        },
      };

      return next;
    }

    case "END_PLAY":
      if (state.phase !== "PLAY") return state;
      return { ...state, phase: "RESOLVE" };

    case "ADVANCE": {
      let next = state;

      if (next.phase === "RESOLVE") {
        // Track instability (MVP: just strikes + log)
        next = markInstabilityIfNeeded(next, next.active);
        return { ...next, phase: "CHECK_WIN" };
      }

      if (next.phase === "CHECK_WIN") {
        const hasAscended = (p: 0 | 1) => {
          const set = new Set<string>();
          for (const s of next.players[p].planet.slots) if (s?.kind === "COLONIZE") set.add(s.c);
          return set.size >= 4;
        };

        if (hasAscended(0)) return { ...next, phase: "GAME_OVER", winner: 0, log: [`P0 Ascended!`, ...next.log] };
        if (hasAscended(1)) return { ...next, phase: "GAME_OVER", winner: 1, log: [`P1 Ascended!`, ...next.log] };

        const nextActive: 0 | 1 = next.active === 0 ? 1 : 0;

        next = resetRoundFlags(next);
        next = {
          ...next,
          active: nextActive,
          turn: next.turn + 1,
          phase: "DRAW",
          counters: { playsRemaining: PLAY_CAP, impactsRemaining: IMPACT_CAP },
        };
        return pushLog(next, `Turn ${next.turn} → P${nextActive} DRAW.`);
      }

      return next;
    }

    default:
      return state;
  }
}
