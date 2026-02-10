import React from "react";
import { UnlockBurst } from "./UnlockBurst";
import type { ColonizeType, ProgressState } from "../utils/progress";

const TYPES: ColonizeType[] = ["PLANT", "ANIMAL", "SENTIENT", "HIGH_TECH"];
const LIFE_MAX = TYPES.length;
const HEALTHY_RGB: [number, number, number] = [110, 231, 183];
const MID_RGB: [number, number, number] = [251, 191, 36];
const CRITICAL_RGB: [number, number, number] = [248, 113, 113];

function lifeColorRatio(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, current / max));
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  return `rgb(${lerp(c1[0], c2[0], t)}, ${lerp(c1[1], c2[1], t)}, ${lerp(c1[2], c2[2], t)})`;
}

function lifeActiveColor(ratio: number): string {
  if (ratio > 0.5) {
    const t = (1 - ratio) * 2;
    return lerpColor(HEALTHY_RGB, MID_RGB, t);
  }
  const t = (0.5 - ratio) * 2;
  return lerpColor(MID_RGB, CRITICAL_RGB, t);
}

export function ProgressTrack(props: {
  player: 0 | 1;
  progress: ProgressState;
  pulseTypes?: ColonizeType[];
  size?: "sm" | "md";
  title?: string;
  testId?: string;
}) {
  const { progress, pulseTypes, size = "md", title = "Life", testId } = props;
  const showLabel = title.trim().length > 0;
  const currentLife = Math.max(0, Math.min(LIFE_MAX, progress.unlockedCount));
  const ratio = lifeColorRatio(currentLife, LIFE_MAX);
  const activeColor = lifeActiveColor(ratio);
  const isCritical = currentLife === 1;
  const isZero = currentLife === 0;
  const glowStrength = ratio;
  const healthyGlowAlpha = 0.35 * glowStrength;
  const healthyGlowBlurAlpha = 0.25 * glowStrength;
  const circleTitle = isCritical ? "Planet in critical condition" : `Planet life ${currentLife}/${LIFE_MAX}`;

  return (
    <div
      data-testid={testId}
      className={`progress-track progress-track--${size}${isCritical ? " progress-track--critical" : ""}${isZero ? " progress-track--empty" : ""}`}
      aria-label={`Player ${props.player + 1} life ${currentLife} of ${LIFE_MAX}`}
      style={
        {
          "--life-color-active": activeColor,
          "--life-color-empty": "rgba(248, 113, 113, 0.25)",
          "--life-border-empty": "rgba(248, 113, 113, 0.35)",
          "--life-glow-outline": `rgba(110, 231, 183, ${healthyGlowAlpha})`,
          "--life-glow-blur": `rgba(110, 231, 183, ${healthyGlowBlurAlpha})`,
        } as React.CSSProperties
      }
      title={circleTitle}
    >
      {showLabel && (
        <div className="progress-track__label">
          {title}: {currentLife}/{LIFE_MAX}
        </div>
      )}
      <div className="progress-track__icons" role="list">
        {TYPES.map((type, index) => {
          const active = index < currentLife;
          const pulsing = active && (pulseTypes?.includes(type) ?? false);
          return (
            <div
              key={type}
              role="listitem"
              className={[
                "progress-icon",
                active ? "progress-icon--active" : "progress-icon--empty",
                isCritical && active ? "progress-icon--critical" : "",
                pulsing ? "progress-pulse" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={`${circleTitle} — ${type.toLowerCase().replace("_", "-")}`}
              aria-hidden="true"
            >
              <UnlockBurst active={pulsing} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
