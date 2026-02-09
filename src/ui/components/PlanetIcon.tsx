import React, { useId } from "react";
import type { PlanetViz } from "../utils/planetViz";

type PlanetIconProps = {
  viz: PlanetViz;
  size?: number;
  label?: string;
  pulse?: boolean;
};

const EXTRA_DOT_POSITIONS = [
  { x: 72, y: 22 },
  { x: 28, y: 24 },
];

export function PlanetIcon({ viz, size = 44, label, pulse = false }: PlanetIconProps) {
  const gradientId = useId();
  const ringColors = viz.ringColors.slice(0, 2);
  const extraColors = viz.ringColors.slice(2);
  return (
    <span className={`planet-icon${pulse ? " planet-icon--pulse" : ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={label ?? "Planet icon"}
        aria-hidden={label ? undefined : true}
      >
        <defs>
          <radialGradient id={gradientId} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={viz.highlightColor} />
            <stop offset="55%" stopColor={viz.baseColor} />
            <stop offset="100%" stopColor={viz.shadowColor} />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="32" fill={`url(#${gradientId})`} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle cx="50" cy="50" r="38" fill="none" stroke={viz.highlightColor} strokeOpacity="0.35" strokeWidth="2" />
        {ringColors.map((color, index) => (
          <circle
            key={`${color}-${index}`}
            cx="50"
            cy="50"
            r={44 + index * 4}
            fill="none"
            stroke={color}
            strokeOpacity="0.45"
            strokeWidth="2"
          />
        ))}
        <circle cx="40" cy="42" r="6" fill="rgba(255,255,255,0.08)" />
        <circle cx="60" cy="58" r="7" fill="rgba(255,255,255,0.05)" />
        {extraColors.length > 0 && (
          <g>
            {extraColors.slice(0, EXTRA_DOT_POSITIONS.length).map((color, index) => (
              <circle
                key={`${color}-dot-${index}`}
                cx={EXTRA_DOT_POSITIONS[index].x}
                cy={EXTRA_DOT_POSITIONS[index].y}
                r="3"
                fill={color}
                fillOpacity="0.65"
              />
            ))}
          </g>
        )}
      </svg>
    </span>
  );
}
