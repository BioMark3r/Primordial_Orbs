export type ImpactFxKind =
  | "METEOR"
  | "TORNADO"
  | "QUAKE"
  | "SOLAR_FLARE"
  | "DISEASE"
  | "TEMPORAL_VORTEX"
  | "BLACK_HOLE";

export type FxStyle = {
  kind: ImpactFxKind;
  bowlClass: string;
  slotClass: string;
  accent: string;
  label: string;
};

const IMPACT_FX: Record<ImpactFxKind, FxStyle> = {
  METEOR: {
    kind: "METEOR",
    bowlClass: "fx-bowl-meteor",
    slotClass: "fx-slot-meteor",
    accent: "#C87A4A",
    label: "Meteor",
  },
  TORNADO: {
    kind: "TORNADO",
    bowlClass: "fx-bowl-tornado",
    slotClass: "fx-slot-tornado",
    accent: "#7A93A6",
    label: "Tornado",
  },
  QUAKE: {
    kind: "QUAKE",
    bowlClass: "fx-bowl-quake",
    slotClass: "fx-slot-quake",
    accent: "#EAC08B",
    label: "Quake",
  },
  SOLAR_FLARE: {
    kind: "SOLAR_FLARE",
    bowlClass: "fx-bowl-solarflare",
    slotClass: "fx-slot-solarflare",
    accent: "#E0B13B",
    label: "Solar Flare",
  },
  DISEASE: {
    kind: "DISEASE",
    bowlClass: "fx-bowl-disease",
    slotClass: "fx-slot-disease",
    accent: "#C35DA6",
    label: "Disease",
  },
  TEMPORAL_VORTEX: {
    kind: "TEMPORAL_VORTEX",
    bowlClass: "fx-bowl-temporalvortex",
    slotClass: "fx-slot-temporalvortex",
    accent: "#5D9CE6",
    label: "Temporal Vortex",
  },
  BLACK_HOLE: {
    kind: "BLACK_HOLE",
    bowlClass: "fx-bowl-blackhole",
    slotClass: "fx-slot-blackhole",
    accent: "#3B3F5C",
    label: "Black Hole",
  },
};

function isImpactFxKind(value: string): value is ImpactFxKind {
  return value in IMPACT_FX;
}

export function fxForImpact(impact: string): FxStyle {
  if (isImpactFxKind(impact)) return IMPACT_FX[impact];
  return {
    kind: "METEOR",
    bowlClass: "fx-bowl-generic",
    slotClass: "fx-slot-generic",
    accent: "#8CAAFF",
    label: impact || "Impact",
  };
}
