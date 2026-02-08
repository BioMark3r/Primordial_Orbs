import type { Core, GameState, Orb, PlayerState } from "./types";
import { IMPACT_CAP, MVP_PLANET_SLOTS, PLAY_CAP } from "./constants";
import { mulberry32, shuffleInPlace } from "./rng";
import { resetRoundFlags } from "./impacts";

function makeBag(): Orb[] {
  const bag: Orb[] = [];
  const terra: Core[] = ["LAND", "WATER", "ICE", "LAVA", "GAS"];
  const colo: any[] = ["PLANT", "ANIMAL", "SENTIENT", "HIGH_TECH"];
  const imp: any[] = ["METEOR", "TORNADO", "QUAKE", "SOLAR_FLARE", "DISEASE", "TEMPORAL_VORTEX"];

  for (let i = 0; i < 30; i++) bag.push({ kind: "TERRAFORM", t: terra[i % terra.length] });
  for (let i = 0; i < 20; i++) bag.push({ kind: "COLONIZE", c: colo[i % colo.length] });
  for (let i = 0; i < 19; i++) bag.push({ kind: "IMPACT", i: imp[i % imp.length] });
  bag.push({ kind: "IMPACT", i: "BLACK_HOLE" });
  return bag;
}

function makePlayer(core: Core): PlayerState {
  return {
    hand: [],
    planet: {
      core,
      slots: Array.from({ length: MVP_PLANET_SLOTS }, (_, idx) =>
        idx === 0 ? ({ kind: "TERRAFORM", t: core } as Orb) : null
      ),
      locked: Array.from({ length: MVP_PLANET_SLOTS }, () => false),
    },
    abilities: {
      plant_block_used_round: false,
      hightech_redirect_used: false,
      land_free_terraform_used_turn: false,
      water_swap_used_turn: false,
      gas_redraw_used_turn: false,
      ice_shield_used_turn: false,
    },
    vulnerability: 0,
    instability_strikes: 0,
  };
}

export function newGame(
  mode: GameState["mode"],
  coreP0: Core,
  coreP1: Core,
  seed = Date.now()
): GameState {
  const rnd = mulberry32(seed);
  const bag = shuffleInPlace(makeBag(), rnd);

  let state: GameState = {
    mode,
    seed,
    phase: "DRAW",
    turn: 1,
    active: 0,
    bag,
    discard: [],
    players: [makePlayer(coreP0), makePlayer(coreP1)],
    planetHistory: [[], []],
    counters: { playsRemaining: PLAY_CAP, impactsRemaining: IMPACT_CAP },
    log: [`Game start (${mode}). Player 1 core ${coreP0}. Player 2 core ${coreP1}. Seed ${seed}.`],
  };


  // Seed per-player planet history with initial planets
  state = {
    ...state,
    planetHistory: [[{ ...state.players[0].planet }], [{ ...state.players[1].planet }]],
  };
  state = resetRoundFlags(state);
  return state;
}
