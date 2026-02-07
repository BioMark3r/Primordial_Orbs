import type { Colonize, Terraform } from "./types";

export const MVP_PLANET_SLOTS = 6;
export const MVP_TERRAFORM_MIN = 3;
export const HAND_CAP = 3;
export const DRAW_N = 2;
export const PLAY_CAP = 2;
export const IMPACT_CAP = 1;

export const COLONIZE_REQ: Record<Colonize, (t: Set<Terraform>, c: Set<Colonize>) => boolean> = {
  PLANT: (t) => t.has("LAND") && t.has("WATER"),
  ANIMAL: (_t, c) => c.has("PLANT"),
  SENTIENT: (_t, c) => c.has("ANIMAL"),
  HIGH_TECH: (t, c) => c.has("SENTIENT") && t.size >= 3,
};
