import type { Colonize, GameState, Impact, Orb, Terraform } from "../engine/types";
import type { ReplayEntryV1 } from "../ui/utils/actionLog";
import type { UIEvent } from "../App";

const TERRA = (t: Terraform): Orb => ({ kind: "TERRAFORM", t });
const COLO = (c: Colonize): Orb => ({ kind: "COLONIZE", c });
const IMP = (i: Impact): Orb => ({ kind: "IMPACT", i });

export const DEMO_STATE_V1: GameState = {
  mode: "LOCAL_2P",
  seed: 424242,
  phase: "PLAY",
  turn: 8,
  active: 0,
  bag: [
    TERRA("WATER"),
    TERRA("LAND"),
    COLO("SENTIENT"),
    IMP("METEOR"),
    TERRA("LAVA"),
    COLO("ANIMAL"),
    IMP("TEMPORAL_VORTEX"),
    TERRA("ICE"),
  ],
  discard: [
    IMP("TORNADO"),
    TERRA("GAS"),
    COLO("PLANT"),
    IMP("SOLAR_FLARE"),
    TERRA("LAND"),
    IMP("QUAKE"),
  ],
  players: [
    {
      hand: [TERRA("GAS"), COLO("HIGH_TECH"), IMP("SOLAR_FLARE")],
      planet: {
        core: "LAVA",
        slots: [
          TERRA("LAVA"),
          TERRA("WATER"),
          TERRA("LAND"),
          COLO("PLANT"),
          COLO("ANIMAL"),
          TERRA("ICE"),
        ],
        locked: [false, false, false, false, false, false],
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
    },
    {
      hand: [TERRA("WATER"), TERRA("ICE"), IMP("QUAKE")],
      planet: {
        core: "ICE",
        slots: [
          TERRA("ICE"),
          TERRA("LAND"),
          COLO("PLANT"),
          null,
          TERRA("WATER"),
          null,
        ],
        locked: [false, false, false, false, false, false],
      },
      abilities: {
        plant_block_used_round: false,
        hightech_redirect_used: false,
        land_free_terraform_used_turn: false,
        water_swap_used_turn: false,
        gas_redraw_used_turn: false,
        ice_shield_used_turn: true,
        disabled_until_turn: 8,
      },
      vulnerability: 1,
      instability_strikes: 0,
    },
  ],
  planetHistory: [
    [
      {
        core: "LAVA",
        slots: [TERRA("LAVA"), TERRA("LAND"), null, null, null, null],
        locked: [false, false, false, false, false, false],
      },
      {
        core: "LAVA",
        slots: [TERRA("LAVA"), TERRA("WATER"), TERRA("LAND"), COLO("PLANT"), COLO("ANIMAL"), TERRA("ICE")],
        locked: [false, false, false, false, false, false],
      },
    ],
    [
      {
        core: "ICE",
        slots: [TERRA("ICE"), TERRA("LAND"), null, null, null, null],
        locked: [false, false, false, false, false, false],
      },
      {
        core: "ICE",
        slots: [TERRA("ICE"), TERRA("LAND"), COLO("PLANT"), null, TERRA("WATER"), null],
        locked: [false, false, false, false, false, false],
      },
    ],
  ],
  counters: {
    playsRemaining: 1,
    impactsRemaining: 1,
  },
  log: [
    "P1 terraformed slot 2 with WATER.",
    "P1 colonized slot 3 with PLANT.",
    "P2 cast QUAKE on Player 1 (removed 1 Terraform).",
    "P2 ended play and advanced turn.",
  ],
};

export const DEMO_REPLAY_LOG_V1: ReplayEntryV1[] = [
  { v: 1, id: "demo-1", at: 1700000001000, player: 0, type: "PLAY_TERRAFORM", payload: { handIndex: 0, slotIndex: 2 } },
  { v: 1, id: "demo-2", at: 1700000002000, player: 0, type: "PLAY_COLONIZE", payload: { handIndex: 1, slotIndex: 3 } },
  { v: 1, id: "demo-3", at: 1700000003000, player: 1, type: "PLAY_IMPACT", payload: { handIndex: 2, target: 0 } },
  { v: 1, id: "demo-4", at: 1700000004000, player: 1, type: "END_PLAY", payload: null },
  { v: 1, id: "demo-5", at: 1700000005000, player: 1, type: "ADVANCE", payload: null },
];

export const DEMO_ARENA_EVENT_V1: UIEvent = {
  kind: "IMPACT_RESOLVED",
  at: 1700000006000,
  impact: "QUAKE",
  source: 1,
  target: 0,
  affectedSlots: [1, 2],
};

export const DEMO_FLASH_STATE_V1 = {
  target: 0 as const,
  slots: [1, 2],
  fxImpact: "QUAKE" as const,
};
