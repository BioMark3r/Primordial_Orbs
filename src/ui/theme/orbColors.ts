export type OrbColor = {
  base: string;
  hi: string;
  lo: string;
  etch: string;
};

export type OrbColorKey =
  | "TERRAFORM_LAND"
  | "TERRAFORM_WATER"
  | "TERRAFORM_ICE"
  | "TERRAFORM_LAVA"
  | "TERRAFORM_GAS"
  | "COLONIZE_PLANT"
  | "COLONIZE_ANIMAL"
  | "COLONIZE_SENTIENT"
  | "COLONIZE_HIGHTECH"
  | "IMPACT_METEOR"
  | "IMPACT_TORNADO"
  | "IMPACT_QUAKE"
  | "IMPACT_SOLAR_FLARE"
  | "IMPACT_DISEASE"
  | "IMPACT_TEMPORALVORTEX"
  | "IMPACT_BLACK_HOLE";

export const ORB_COLORS = {
  // Terraform
  TERRAFORM_LAND: { base: "#8BB174", hi: "#CFE9C2", lo: "#2B3A2A", etch: "rgba(255,255,255,0.22)" },
  TERRAFORM_WATER: { base: "#3E8FB0", hi: "#B9E7F6", lo: "#0E2A38", etch: "rgba(255,255,255,0.22)" },
  TERRAFORM_ICE: { base: "#B7D7EA", hi: "#F3FBFF", lo: "#234353", etch: "rgba(0,0,0,0.18)" },
  TERRAFORM_LAVA: { base: "#D46A3A", hi: "#FFD0B3", lo: "#3A140B", etch: "rgba(255,255,255,0.24)" },
  TERRAFORM_GAS: { base: "#7E63C6", hi: "#D9C9FF", lo: "#22163F", etch: "rgba(255,255,255,0.22)" },

  // Colonize
  COLONIZE_PLANT: { base: "#55C07A", hi: "#CFF7DE", lo: "#163A22", etch: "rgba(255,255,255,0.20)" },
  COLONIZE_ANIMAL: { base: "#D2A84A", hi: "#FFE7B0", lo: "#3B2A08", etch: "rgba(255,255,255,0.22)" },
  COLONIZE_SENTIENT: { base: "#4BB6B0", hi: "#BFF7F3", lo: "#0E3432", etch: "rgba(255,255,255,0.20)" },
  COLONIZE_HIGHTECH: { base: "#A7B0C7", hi: "#F2F6FF", lo: "#232A3A", etch: "rgba(0,0,0,0.18)" },

  // Impacts
  IMPACT_METEOR: { base: "#C87A4A", hi: "#FFD3B8", lo: "#2B1208", etch: "rgba(255,255,255,0.24)" },
  IMPACT_TORNADO: { base: "#7A93A6", hi: "#E2F0FA", lo: "#1E2A33", etch: "rgba(255,255,255,0.22)" },
  IMPACT_QUAKE: { base: "#8A7F73", hi: "#EFE4D6", lo: "#241F1A", etch: "rgba(255,255,255,0.22)" },
  IMPACT_SOLAR_FLARE: { base: "#E0B13B", hi: "#FFF2B6", lo: "#3A2A05", etch: "rgba(0,0,0,0.18)" },
  IMPACT_DISEASE: { base: "#C35DA6", hi: "#FFD0F0", lo: "#3B0E2B", etch: "rgba(255,255,255,0.22)" },
  IMPACT_TEMPORALVORTEX: { base: "#5D9CE6", hi: "#D6EEFF", lo: "#0D2440", etch: "rgba(255,255,255,0.22)" },
  IMPACT_BLACK_HOLE: { base: "#3B3F5C", hi: "#C7CCFF", lo: "#05060B", etch: "rgba(255,255,255,0.22)" },
} as const satisfies Record<OrbColorKey, OrbColor>;

export const ORB_COLOR_LABELS = {
  TERRAFORM_LAND: "Land terraforming orb",
  TERRAFORM_WATER: "Water terraforming orb",
  TERRAFORM_ICE: "Ice terraforming orb",
  TERRAFORM_LAVA: "Lava terraforming orb",
  TERRAFORM_GAS: "Gas terraforming orb",
  COLONIZE_PLANT: "Plant colonizing orb",
  COLONIZE_ANIMAL: "Animal colonizing orb",
  COLONIZE_SENTIENT: "Sentient colonizing orb",
  COLONIZE_HIGHTECH: "High-Tech colonizing orb",
  IMPACT_METEOR: "Meteor impact orb",
  IMPACT_TORNADO: "Tornado impact orb",
  IMPACT_QUAKE: "Quake impact orb",
  IMPACT_SOLAR_FLARE: "Solar flare impact orb",
  IMPACT_DISEASE: "Disease impact orb",
  IMPACT_TEMPORALVORTEX: "Temporal vortex impact orb",
  IMPACT_BLACK_HOLE: "Black hole impact orb",
} as const satisfies Record<OrbColorKey, string>;
