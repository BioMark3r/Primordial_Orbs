import type { Colonize, Orb, Terraform } from "../../engine/types";
import { ORB_COLORS, type OrbColorKey } from "../theme/orbColors";

export type PlanetViz = {
  dominantTerraform: Terraform | null;
  terraformCounts: Record<Terraform, number>;
  colonizeCounts: Record<Colonize, number>;
  baseColor: string;
  highlightColor: string;
  shadowColor: string;
  ringColors: string[];
};

const TERRAFORM_ORDER: Terraform[] = ["WATER", "LAND", "LAVA", "ICE", "GAS"];
const COLONIZE_ORDER: Colonize[] = ["PLANT", "ANIMAL", "SENTIENT", "HIGH_TECH"];
const COLONIZE_COLOR_KEYS: Record<Colonize, OrbColorKey> = {
  PLANT: "COLONIZE_PLANT",
  ANIMAL: "COLONIZE_ANIMAL",
  SENTIENT: "COLONIZE_SENTIENT",
  HIGH_TECH: "COLONIZE_HIGHTECH",
};

function getDominantTerraform(terraformCounts: Record<Terraform, number>): Terraform | null {
  const maxCount = Math.max(...Object.values(terraformCounts));
  if (maxCount <= 0) return null;
  return TERRAFORM_ORDER.find((terraform) => terraformCounts[terraform] === maxCount) ?? null;
}

export function computePlanetViz(slots: (Orb | null)[]): PlanetViz {
  const terraformCounts: Record<Terraform, number> = {
    LAND: 0,
    WATER: 0,
    ICE: 0,
    LAVA: 0,
    GAS: 0,
  };
  const colonizeCounts: Record<Colonize, number> = {
    PLANT: 0,
    ANIMAL: 0,
    SENTIENT: 0,
    HIGH_TECH: 0,
  };

  for (const slot of slots) {
    if (!slot) continue;
    if (slot.kind === "TERRAFORM") terraformCounts[slot.t] += 1;
    if (slot.kind === "COLONIZE") colonizeCounts[slot.c] += 1;
  }

  const dominantTerraform = getDominantTerraform(terraformCounts);
  const neutralColors = ORB_COLORS.IMPACT_BLACK_HOLE;
  const terraformColors = dominantTerraform
    ? ORB_COLORS[`TERRAFORM_${dominantTerraform}` as OrbColorKey]
    : neutralColors;

  const ringColors = COLONIZE_ORDER.flatMap((colonize) =>
    colonizeCounts[colonize] > 0 ? [ORB_COLORS[COLONIZE_COLOR_KEYS[colonize]].base] : [],
  );

  return {
    dominantTerraform,
    terraformCounts,
    colonizeCounts,
    baseColor: terraformColors.base,
    highlightColor: terraformColors.hi,
    shadowColor: terraformColors.lo,
    ringColors,
  };
}
