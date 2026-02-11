import { useMemo } from "react";
import { computeProfileStats, exportMatches } from "../../profile/matchHistory";
import { clearProfileMatches } from "../../profile/matchHistory";
import type { MatchResult, Profile } from "../../profile/types";

type StatsModalProps = {
  open: boolean;
  profile: Profile | null;
  matches: MatchResult[];
  onClose: () => void;
  onReset: () => void;
};

export function StatsModal({ open, profile, matches, onClose, onReset }: StatsModalProps) {
  const stats = useMemo(() => (profile ? computeProfileStats(profile.id, matches) : null), [matches, profile]);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel" style={{ width: "min(560px, 95vw)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0 }}>{profile ? `${profile.name} Stats` : "Stats"}</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        {!profile || !stats ? (
          <p style={{ marginTop: 12 }}>No active profile selected.</p>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div>Total Games: <b>{stats.total}</b></div>
            <div>Wins: <b>{stats.wins}</b> • Losses: <b>{stats.losses}</b> • Win %: <b>{stats.winRate.toFixed(1)}%</b></div>
            <div>Current Streak: <b>{stats.currentStreak}</b> • Best Streak: <b>{stats.bestStreak}</b></div>
            <div>Vs CPU: {stats.byMode.cpu.wins}W / {stats.byMode.cpu.losses}L</div>
            <div>Vs Human: {stats.byMode.human.wins}W / {stats.byMode.human.losses}L</div>
            {Object.keys(stats.byCpuPersonality).length > 0 && (
              <div>
                CPU Personalities:
                <ul style={{ margin: "6px 0 0 18px" }}>
                  {Object.entries(stats.byCpuPersonality).map(([personality, entry]) => (
                    <li key={personality}>{personality}: {entry.wins}W / {entry.losses}L</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([exportMatches()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "primordial-orbs-stats.json";
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export Stats
          </button>
          <button
            type="button"
            onClick={() => {
              if (!profile) return;
              const confirmed = window.confirm(`Reset all stats for ${profile.name}?`);
              if (!confirmed) return;
              clearProfileMatches(profile.id);
              onReset();
            }}
          >
            Reset Stats
          </button>
        </div>
      </div>
    </div>
  );
}
