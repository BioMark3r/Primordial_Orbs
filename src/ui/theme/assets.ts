import type { Core, Terraform, Colonize, Impact, Orb } from "../../engine/types";

export const coreIcon: Record<Core, string> = {
  LAND: "/src/assets/cores/core-land.svg",
  WATER: "/src/assets/cores/core-water.svg",
  ICE: "/src/assets/cores/core-ice.svg",
  LAVA: "/src/assets/cores/core-lava.svg",
  GAS: "/src/assets/cores/core-gas.svg",
};

export const terraformIcon: Record<Terraform, string> = {
  LAND: "/src/assets/orbs/terraform-land.svg",
  WATER: "/src/assets/orbs/terraform-water.svg",
  ICE: "/src/assets/orbs/terraform-ice.svg",
  LAVA: "/src/assets/orbs/terraform-lava.svg",
  GAS: "/src/assets/orbs/terraform-gas.svg",
};

export const colonizeIcon: Record<Colonize, string> = {
  PLANT: "/src/assets/orbs/colonize-plant.svg",
  ANIMAL: "/src/assets/orbs/colonize-animal.svg",
  SENTIENT: "/src/assets/orbs/colonize-sentient.svg",
  HIGH_TECH: "/src/assets/orbs/colonize-hightech.svg",
};

export const impactIcon: Record<Impact, string> = {
  METEOR: "/src/assets/orbs/impact-meteor.svg",
  TORNADO: "/src/assets/orbs/impact-tornado.svg",
  QUAKE: "/src/assets/orbs/impact-quake.svg",
  SOLAR_FLARE: "/src/assets/orbs/impact-solarflare.svg",
  DISEASE: "/src/assets/orbs/impact-disease.svg",
  TEMPORAL_VORTEX: "/src/assets/orbs/impact-temporalvortex.svg",
  BLACK_HOLE: "/src/assets/orbs/impact-blackhole.svg",
};

export function orbIcon(o: Orb): string {
  if (o.kind === "TERRAFORM") return terraformIcon[o.t];
  if (o.kind === "COLONIZE") return colonizeIcon[o.c];
  return impactIcon[o.i];
}
