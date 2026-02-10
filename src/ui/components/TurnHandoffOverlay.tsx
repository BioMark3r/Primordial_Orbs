import React, { useEffect } from "react";
import { PlanetIcon } from "./PlanetIcon";
import type { PlanetViz } from "../utils/planetViz";

type TurnHandoffOverlayProps = {
  open: boolean;
  player: 0 | 1;
  viz: PlanetViz;
  durationMs?: number;
  onDone: () => void;
};

export function TurnHandoffOverlay({
  open,
  player,
  viz,
  durationMs = 850,
  onDone,
}: TurnHandoffOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      onDone();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onDone, open]);

  if (!open) return null;

  return (
    <button
      type="button"
      className="turn-handoff ui-overlayCard"
      style={{ animationDuration: `${durationMs}ms` }}
      onClick={onDone}
      role="status"
      aria-live="polite"
    >
      <PlanetIcon viz={viz} size={34} label={`Player ${player + 1} planet`} />
      <div className="turn-handoff__text">
        <div className="turn-handoff__title">Player {player + 1}&apos;s Turn</div>
        <div className="turn-handoff__subtitle">Draw to begin</div>
      </div>
    </button>
  );
}
