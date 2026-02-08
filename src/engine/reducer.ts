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

function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}

function clonePlanet(planet: { core: any; slots: any[]; locked: boolean[] }) {
  return { core: planet.core, slots: [...planet.slots], locked: [...planet.locked] };
}
function recordPlanet(state: GameState, p: 0 | 1): GameState {
  const ph = [...state.planetHistory] as GameState["planetHistory"];
  const list = [...ph[p], clonePlanet(state.players[p].planet)];
  ph[p] = list;
  return { ...state, planetHistory: ph };
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
      const ps = state.players[p];

      const hand = [...ps.hand];
      const orb = hand[action.handIndex];
      if (!orb || orb.kind !== "TERRAFORM") return state;

      // GAS weakness: cannot place ICE terraform
      if (ps.planet.core === "GAS" && orb.t === "ICE") return state;

      if (!canPlaceTerraform(state, p, action.slotIndex)) return state;

      // LAND passive: first terraform each turn is free (no play spent)
      let cost = 1;
      let landFree = false;
      if (ps.planet.core === "LAND" && !ps.abilities.land_free_terraform_used_turn && abilitiesEnabled(state, p)) {
        cost = 0;
        landFree = true;
      }

      hand.splice(action.handIndex, 1);
      const planet = { ...ps.planet };
      const slots = [...planet.slots];
      slots[action.slotIndex] = orb;

      let players = [...state.players] as GameState["players"];
      const newAbilities = { ...ps.abilities };
      if (landFree) newAbilities.land_free_terraform_used_turn = true;

      players[p] = { ...ps, hand, planet: { ...planet, slots }, abilities: newAbilities };

      // ICE weakness: on an ICE-core planet, placing LAVA melts one ICE terraform (highest index)
      if (players[p].planet.core === "ICE" && orb.t === "LAVA") {
        const planet2 = players[p].planet;
        const slots2 = [...planet2.slots];
        let iceIdx = -1;
        for (let i = slots2.length - 1; i >= 0; i--) {
          const s = slots2[i];
          if (s?.kind === "TERRAFORM" && s.t === "ICE" && !planet2.locked[i]) { iceIdx = i; break; }
        }
        if (iceIdx !== -1) {
          const removed = slots2[iceIdx]!;
          slots2[iceIdx] = null;
          players[p] = { ...players[p], planet: { ...planet2, slots: slots2 } };

          let next = {
            ...state,
            players,
            discard: [...state.discard, removed],
            counters: { ...state.counters, playsRemaining: state.counters.playsRemaining - cost },
          };
          next = recordPlanet(next, p);
          return pushLog(next, `P${p} terraformed LAVA → melted ICE at slot ${iceIdx}.${landFree ? " (Passive: Land free terraform)" : ""}`);
        }
      }

      let next = { ...state, players, counters: { ...state.counters, playsRemaining: state.counters.playsRemaining - cost } };
      next = recordPlanet(next, p);
      return pushLog(next, `P${p} terraformed ${orb.t} → slot ${action.slotIndex}.${landFree ? " (Passive: Land free terraform)" : ""}`);
    }

    case "PLAY_COLONIZE": {
      if (state.phase !== "PLAY") return state;
      if (state.counters.playsRemaining <= 0) return state;

      const p = state.active;
      const ps = state.players[p];

      const hand = [...ps.hand];
      const orb = hand[action.handIndex];
      if (!orb || orb.kind !== "COLONIZE") return state;

      if (!canPlaceColonize(state, p, orb.c, action.slotIndex)) return state;

      hand.splice(action.handIndex, 1);
      const planet = { ...ps.planet };
      const slots = [...planet.slots];
      slots[action.slotIndex] = orb;

      let players = [...state.players] as GameState["players"];
      players[p] = { ...ps, hand, planet: { ...planet, slots } };

      const newVuln = colonizeCount({ ...state, players }, p);
      players[p] = { ...players[p], vulnerability: newVuln };

      let next = { ...state, players, counters: { ...state.counters, playsRemaining: state.counters.playsRemaining - 1 } };
      next = recordPlanet(next, p);
      return pushLog(next, `P${p} colonized ${orb.c}. Vulnerability +${newVuln}.`);
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
        counters: { playsRemaining: next.counters.playsRemaining - 1, impactsRemaining: next.counters.impactsRemaining - 1 },
      };

      return next;
    }

    case "WATER_SWAP": {
      if (state.phase !== "PLAY") return state;
      const p = state.active;
      const ps = state.players[p];
      if (ps.planet.core !== "WATER") return state;
      if (!abilitiesEnabled(state, p)) return state;
      if (ps.abilities.water_swap_used_turn) return state;

      const { slotA, slotB } = action;
      if (slotA === slotB) return state;
      if (slotA < 0 || slotA >= ps.planet.slots.length) return state;
      if (slotB < 0 || slotB >= ps.planet.slots.length) return state;
      if (ps.planet.locked[slotA] || ps.planet.locked[slotB]) return state;

      const slots = [...ps.planet.slots];
      const a = slots[slotA];
      const b = slots[slotB];
      if (a?.kind !== "TERRAFORM" || b?.kind !== "TERRAFORM") return state;

      slots[slotA] = b;
      slots[slotB] = a;

      const players = [...state.players] as GameState["players"];
      players[p] = { ...ps, planet: { ...ps.planet, slots }, abilities: { ...ps.abilities, water_swap_used_turn: true } };

      let next = { ...state, players };
      next = recordPlanet(next, p);
      return pushLog(next, `P${p} used Water Swap: slots ${slotA} and ${slotB}. (Passive: Water Swap)`);
    }

    case "GAS_REDRAW": {
      if (state.phase !== "PLAY") return state;
      const p = state.active;
      const ps = state.players[p];
      if (ps.planet.core !== "GAS") return state;
      if (!abilitiesEnabled(state, p)) return state;
      if (ps.abilities.gas_redraw_used_turn) return state;

      const hand = [...ps.hand];
      if (action.handIndex < 0 || action.handIndex >= hand.length) return state;

      const [removed] = hand.splice(action.handIndex, 1);
      let next: GameState = { ...state, discard: [...state.discard, removed] };

      const r = drawOne(next);
      next = r.state;
      if (r.orb) hand.push(r.orb);

      const players = [...next.players] as GameState["players"];
      players[p] = { ...ps, hand, abilities: { ...ps.abilities, gas_redraw_used_turn: true } };

      return pushLog({ ...next, players }, `P${p} used Gas Redraw (discarded 1, drew 1). (Passive: Gas Redraw)`);
    }

    case "END_PLAY":
      if (state.phase !== "PLAY") return state;
      return { ...state, phase: "RESOLVE" };

    case "ADVANCE": {
      let next = state;

      if (next.phase === "RESOLVE") {
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
        next = { ...next, active: nextActive, turn: next.turn + 1, phase: "DRAW", counters: { playsRemaining: PLAY_CAP, impactsRemaining: IMPACT_CAP } };
        return pushLog(next, `Turn ${next.turn} → P${nextActive} DRAW.`);
      }

      return next;
    }

    default:
      return state;
  }
}
