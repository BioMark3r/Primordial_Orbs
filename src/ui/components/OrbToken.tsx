import React from "react";
import type { Orb } from "../../engine/types";
import { getOrbSymbol } from "../icons/orbSymbols";
import { OrbVisual, type OrbVisualSize } from "./OrbVisual";
import { ORB_COLORS, type OrbColor, type OrbColorKey } from "../theme/orbColors";

type Size = OrbVisualSize;
const FALLBACK_COLORS: OrbColor = {
  base: "#6B7280",
  hi: "#E5E7EB",
  lo: "#111827",
  etch: "rgba(255,255,255,0.22)",
};


function colorKeyForOrb(orb: Orb): string {
  if (orb.kind === "TERRAFORM") return `TERRAFORM_${orb.t}`;
  if (orb.kind === "COLONIZE") return `COLONIZE_${orb.c === "HIGH_TECH" ? "HIGHTECH" : orb.c}`;
  return `IMPACT_${orb.i}`;
}

function categoryForOrb(orb: Orb): "terraform" | "colonize" | "impact" {
  if (orb.kind === "TERRAFORM") return "terraform";
  if (orb.kind === "COLONIZE") return "colonize";
  return "impact";
}

function elementForOrb(orb: Orb): "lava" | "ice" | "nature" | "void" {
  if (orb.kind === "TERRAFORM") {
    if (orb.t === "LAVA") return "lava";
    if (orb.t === "ICE") return "ice";
    return "nature";
  }
  if (orb.kind === "COLONIZE") {
    if (orb.c === "HIGH_TECH") return "void";
    return "nature";
  }
  if (orb.i === "BLACK_HOLE" || orb.i === "TEMPORAL_VORTEX") return "void";
  if (orb.i === "SOLAR_FLARE" || orb.i === "METEOR") return "lava";
  if (orb.i === "TORNADO") return "ice";
  return "nature";
}

export function OrbToken(props: {
  orb: Orb;
  size?: Size;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  actionable?: boolean;
  burst?: boolean;
  animateIn?: boolean;
  hovered?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const size = props.size ?? "md";
  const orbKey = colorKeyForOrb(props.orb);
  const colors = ORB_COLORS[orbKey as OrbColorKey] ?? FALLBACK_COLORS;
  const categoryClass = categoryForOrb(props.orb);
  const elementClass = elementForOrb(props.orb);

  const style: React.CSSProperties & Record<string, string | number> = {
    cursor: props.disabled ? "not-allowed" : props.onClick ? "pointer" : "default",
    padding: 0,
    border: 0,
    background: "transparent",
    display: "grid",
    placeItems: "center",
    "--orb-base": colors.base,
    "--orb-hi": colors.hi,
    "--orb-lo": colors.lo,
    "--orb-etch": colors.etch,
  };

  const isButton = Boolean(props.onClick);
  const Component = (isButton ? "button" : "div") as "button" | "div";

  const sharedProps = {
    style,
    title: props.title ?? props.disabledReason,
  };

  if (Component === "button") {
    const isDisabled = Boolean(props.disabled);
    return (
      <button
        type="button"
        {...sharedProps}
        onClick={isDisabled ? undefined : props.onClick}
        disabled={isDisabled && !props.disabledReason}
        aria-disabled={isDisabled || undefined}
      >
        <OrbVisual
          element={elementClass}
          categoryClass={categoryClass}
          size={size}
          isSelected={Boolean(props.selected)}
          isPlayable={Boolean(props.actionable && !props.disabled)}
          isDisabled={Boolean(props.disabled)}
          isHovered={Boolean(props.hovered)}
          animateIn={Boolean(props.animateIn)}
          burst={Boolean(props.burst)}
          symbol={getOrbSymbol(props.orb)}
        />
      </button>
    );
  }

  return (
    <div {...sharedProps} aria-disabled={props.disabled || undefined}>
      <OrbVisual
        element={elementClass}
        categoryClass={categoryClass}
        size={size}
        isSelected={Boolean(props.selected)}
        isPlayable={Boolean(props.actionable && !props.disabled)}
        isDisabled={Boolean(props.disabled)}
        isHovered={Boolean(props.hovered)}
        animateIn={Boolean(props.animateIn)}
        burst={Boolean(props.burst)}
        symbol={getOrbSymbol(props.orb)}
      />
    </div>
  );
}
