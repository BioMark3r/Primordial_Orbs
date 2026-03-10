import React from "react";
import { OrbIcon, type OrbElement } from "./OrbIcon";

export type OrbVisualSize = "sm" | "md" | "lg" | "slot";

const px: Record<OrbVisualSize, number | string> = { sm: 34, md: 52, lg: 74, slot: 72 };

type OrbVisualProps = {
  element: OrbElement;
  categoryClass: "terraform" | "colonize" | "impact";
  size?: OrbVisualSize;
  isHovered?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  isDisabled?: boolean;
  animateIn?: boolean;
  burst?: boolean;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  symbol?: React.ReactNode;
};

export function OrbVisual({
  element,
  categoryClass,
  size = "md",
  isHovered = false,
  isSelected = false,
  isPlayable = false,
  isDisabled = false,
  animateIn = false,
  burst = false,
  className,
  title,
  style,
  symbol,
}: OrbVisualProps) {
  const d = px[size];
  const cls = [
    "orb",
    "orb--shimmerable",
    `orb--${categoryClass}`,
    `orb--element-${element}`,
    isHovered ? "orb--hovered" : "",
    isSelected ? "orb--selected" : "",
    isDisabled ? "orb--disabled" : "",
    isPlayable ? "orb--playable" : "",
    animateIn ? "orb--animate-in" : "",
    burst ? "orb--burst" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} style={{ width: d, height: d, ...style }} title={title}>
      <OrbIcon element={element} size="100%" />
      <div className="orb__shell" aria-hidden="true" />
      <div className="orb__spec" aria-hidden="true" />
      <div className={`orb__ring orb__ring--${categoryClass}`} aria-hidden="true" />
      <div className="orb__etch" aria-hidden="true">
        {symbol}
      </div>
    </div>
  );
}
