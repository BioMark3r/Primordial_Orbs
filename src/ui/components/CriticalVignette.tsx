import React from "react";

export type CriticalVignetteProps = {
  criticalPlayer: 0 | 1 | null;
  criticalIntensity: number;
  endgamePulse?: boolean;
};

export function CriticalVignette({ criticalPlayer, criticalIntensity, endgamePulse = false }: CriticalVignetteProps) {
  if (criticalPlayer === null && !endgamePulse) return null;

  const normalizedIntensity = Math.max(0, Math.min(0.62, criticalIntensity));

  return (
    <div
      aria-hidden
      className={[
        "criticalVignette",
        criticalPlayer !== null ? `criticalVignette--p${criticalPlayer}` : "",
        criticalPlayer !== null ? "criticalVignette--on" : "",
        endgamePulse ? "criticalVignette--endgamePulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--critical-intensity": normalizedIntensity } as React.CSSProperties}
    />
  );
}
