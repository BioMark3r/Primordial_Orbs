export type Mode = "LOCAL_2P" | "VS_AI" | "SOLO_ENTROPY";
export type Phase = "DRAW" | "PLAY" | "RESOLVE" | "CHECK_WIN" | "GAME_OVER";

export type Terraform = "LAND" | "WATER" | "ICE" | "LAVA" | "GAS";
export type Colonize = "PLANT" | "ANIMAL" | "SENTIENT" | "HIGH_TECH";
export type Impact =
  | "METEOR"
  | "TORNADO"
  | "QUAKE"
  | "SOLAR_FLARE"
  | "DISEASE"
  | "TEMPORAL_VORTEX"
  | "BLACK_HOLE";

export type Orb =
  | { kind: "TERRAFORM"; t: Terraform }
  | { kind: "COLONIZE"; c: Colonize }
  | { kind: "IMPACT"; i: Impact };

export type Core = Terraform;
export type Slot = Orb | null;

export interface Planet {
  core: Core;
  slots: Slot[];
  locked: boolean[];
}

export interface AbilityState {
  plant_block_used_round: boolean;
  hightech_redirect_used: boolean;
  disabled_until_turn?: number;
}

export interface PlayerState {
  hand: Orb[];
  planet: Planet;
  abilities: AbilityState;
  vulnerability: number;
  instability_strikes: number;
}

export interface TurnCounters {
  playsRemaining: number;     // starts at 2
  impactsRemaining: number;   // starts at 1
}

export interface GameState {
  mode: Mode;
  phase: Phase;
  turn: number;          // increments each player turn
  active: 0 | 1;
  bag: Orb[];
  discard: Orb[];
  players: [PlayerState, PlayerState];
  counters: TurnCounters;
  log: string[];
  winner?: 0 | 1;
}

export type Action =
  | { type: "NEW_GAME"; mode: Mode; coreP0: Core; coreP1: Core; seed?: number }
  | { type: "DRAW_2" }
  | { type: "DISCARD_FROM_HAND"; index: number }
  | { type: "PLAY_TERRAFORM"; handIndex: number; slotIndex: number }
  | { type: "PLAY_COLONIZE"; handIndex: number; slotIndex: number }
  | { type: "PLAY_IMPACT"; handIndex: number } // default target is opponent
  | { type: "END_PLAY" }
  | { type: "ADVANCE" };
