import React from "react";

const SPARKLES = Array.from({ length: 8 }, (_, index) => index);

export function WinCelebration({ player }: { player: 0 | 1 }) {
  return (
    <div className="win-celebration" aria-live="polite">
      <div className="win-celebration__panel">
        <div className="win-celebration__title">Planet Fully Colonized!</div>
        <div className="win-celebration__subtitle">Player {player + 1} unlocked all life types.</div>
        <div className="win-celebration__sparkles" aria-hidden="true">
          {SPARKLES.map((sparkle) => (
            <span key={sparkle} className={`win-celebration__spark win-celebration__spark--${sparkle}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
