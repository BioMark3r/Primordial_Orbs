import React from "react";
import { UnlockBurst } from "./UnlockBurst";
import type { ColonizeType, ProgressState } from "../utils/progress";

const TYPES: ColonizeType[] = ["PLANT", "ANIMAL", "SENTIENT", "HIGH_TECH"];
const LIFE_MAX = TYPES.length;

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
  const isCritical = currentLife === 1;
  const circleTitle = isCritical ? "Planet in critical condition" : `Planet life ${currentLife}/${LIFE_MAX}`;

  return (
    <div
      data-testid={testId}
      className={`progress-track progress-track--${size}${isCritical ? " progress-track--critical" : ""}`}
      aria-label={`Player ${props.player + 1} life ${currentLife} of ${LIFE_MAX}`}
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
