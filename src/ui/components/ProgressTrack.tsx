import React from "react";
import { colonizeIcon } from "../theme/assets";
import { UnlockBurst } from "./UnlockBurst";
import type { ColonizeType, ProgressState } from "../utils/progress";

const TYPES: ColonizeType[] = ["PLANT", "ANIMAL", "SENTIENT", "HIGH_TECH"];

const TYPE_LABELS: Record<ColonizeType, string> = {
  PLANT: "Plant",
  ANIMAL: "Animal",
  SENTIENT: "Sentient",
  HIGH_TECH: "High-Tech",
};

const TYPE_ABBR: Record<ColonizeType, string> = {
  PLANT: "PL",
  ANIMAL: "AN",
  SENTIENT: "SE",
  HIGH_TECH: "HT",
};

export function ProgressTrack(props: {
  player: 0 | 1;
  progress: ProgressState;
  pulseTypes?: ColonizeType[];
  size?: "sm" | "md";
  title?: string;
}) {
  const { progress, pulseTypes, size = "md", title = "Life" } = props;
  return (
    <div className={`progress-track progress-track--${size}`} aria-label={`Player ${props.player + 1} progress`}>
      <div className="progress-track__label">
        {title}: {progress.unlockedCount}/4
      </div>
      <div className="progress-track__icons" role="list">
        {TYPES.map((type) => {
          const unlocked = progress.unlocked[type];
          const pulsing = pulseTypes?.includes(type) ?? false;
          const iconSrc = colonizeIcon[type];
          return (
            <div
              key={type}
              role="listitem"
              className={[
                "progress-icon",
                unlocked ? "progress-unlocked" : "progress-locked",
                pulsing ? "progress-pulse" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={`${TYPE_LABELS[type]} colonize ${unlocked ? "unlocked" : "locked"}`}
            >
              <UnlockBurst active={pulsing} />
              {iconSrc ? (
                <img src={iconSrc} alt={TYPE_LABELS[type]} />
              ) : (
                <span className="progress-icon__abbr">{TYPE_ABBR[type]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
