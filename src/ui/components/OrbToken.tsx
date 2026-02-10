import React from "react";
import type { Orb } from "../../engine/types";
import { getOrbSymbol } from "../icons/orbSymbols";
import { ORB_COLORS, type OrbColor, type OrbColorKey } from "../theme/orbColors";

type Size = "sm" | "md" | "lg" | "slot";

const px: Record<Size, number | string> = { sm: 34, md: 52, lg: 74, slot: "var(--slot)" };
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

export function OrbToken(props: {
  orb: Orb;
  size?: Size;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  actionable?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const size = props.size ?? "md";
  const d = px[size];
  const orbKey = colorKeyForOrb(props.orb);
  const colors = ORB_COLORS[orbKey as OrbColorKey] ?? FALLBACK_COLORS;
  const categoryClass = categoryForOrb(props.orb);

  const cls = [
    "orb",
    `orb--${categoryClass}`,
    props.selected ? "orb--selected" : "",
    props.disabled ? "orb--disabled" : "",
    props.actionable ? "orb--actionable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style: React.CSSProperties & Record<string, string | number> = {
    width: d,
    height: d,
    padding: 0,
    background: "transparent",
    cursor: props.disabled ? "not-allowed" : props.onClick ? "pointer" : "default",
    "--orb-base": colors.base,
    "--orb-hi": colors.hi,
    "--orb-lo": colors.lo,
    "--orb-etch": colors.etch,
  };

  const isButton = Boolean(props.onClick);
  const Component = (isButton ? "button" : "div") as "button" | "div";

  const sharedProps = {
    className: cls,
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
        <div className="orb__shell" aria-hidden="true" />
        <div className="orb__spec" aria-hidden="true" />
        <div className={`orb__ring orb__ring--${categoryClass}`} aria-hidden="true" />
        <div className="orb__etch" aria-hidden="true">
          {getOrbSymbol(props.orb)}
        </div>
      </button>
    );
  }

  return (
    <div {...sharedProps} aria-disabled={props.disabled || undefined}>
      <div className="orb__shell" aria-hidden="true" />
      <div className="orb__spec" aria-hidden="true" />
      <div className={`orb__ring orb__ring--${categoryClass}`} aria-hidden="true" />
      <div className="orb__etch" aria-hidden="true">
        {getOrbSymbol(props.orb)}
      </div>
    </div>
  );
}
