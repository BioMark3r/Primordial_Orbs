import React, { useEffect } from "react";
import type { TurnRecap } from "../utils/turnRecap";

type TurnRecapToastProps = {
  recap: TurnRecap | null;
  open: boolean;
  durationMs?: number;
  onDone: () => void;
};

export function TurnRecapToast({ recap, open, durationMs = 1400, onDone }: TurnRecapToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      onDone();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onDone, open]);

  if (!recap) return null;

  return (
    <div
      className={`turn-recap-toast ui-overlayCard${open ? " turn-recap-toast--open" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="turn-recap-toast__title">{recap.title}</div>
      <ul className="turn-recap-toast__list">
        {recap.bullets.map((bullet, index) => (
          <li key={`${bullet}-${index}`} className="turn-recap-toast__item">
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
