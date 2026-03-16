import React from "react";

type AppTopHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  coachEnabled: boolean;
  onCoachEnabledChange: (next: boolean) => void;
  networkStatusLabel: string;
  musicEnabled: boolean;
  onToggleMusic: () => void;
};

export function AppTopHeader(props: AppTopHeaderProps) {
  return (
    <header className="app-top-header ui-panel" data-testid="app-top-header">
      <div>
        <div style={{ fontWeight: 800 }}>{props.title}</div>
        {props.subtitle && <div className="setup-muted">{props.subtitle}</div>}
      </div>
      <div className="app-top-header__controls">
        {props.onBack && <button onClick={props.onBack}>Back</button>}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={props.coachEnabled} onChange={(e) => props.onCoachEnabledChange(e.target.checked)} />
          Coach
        </label>
        <span className="ui-chip">Network Status: {props.networkStatusLabel}</span>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={props.onToggleMusic}>
          {props.musicEnabled ? "Music: On" : "Music: Off"}
        </button>
      </div>
    </header>
  );
}
