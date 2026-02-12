import { useMemo, useState } from "react";
import { clearProfileMatches, computeProfileStats, exportMatches } from "../../profile/matchHistory";
import type { MatchResult, Profile, ProfileId } from "../../profile/types";
import { GUEST_ID } from "../../profile/types";

type StatsModalProps = {
  open: boolean;
  activeProfileId: ProfileId;
  profiles: Profile[];
  matches: MatchResult[];
  onClose: () => void;
  onReset: () => void;
  onCreateProfile: () => void;
};

export function StatsModal({ open, activeProfileId, profiles, matches, onClose, onReset, onCreateProfile }: StatsModalProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<ProfileId>(activeProfileId);

  const options = useMemo(
    () => [
      ...new Set<ProfileId>([activeProfileId, GUEST_ID, ...profiles.map((profile) => profile.id)]),
    ],
    [activeProfileId, profiles],
  );

  const selectedName = useMemo(() => {
    if (selectedProfileId === GUEST_ID) return "Guest";
    return profiles.find((profile) => profile.id === selectedProfileId)?.name ?? "Profile";
  }, [profiles, selectedProfileId]);

  const stats = useMemo(() => computeProfileStats(selectedProfileId, matches), [matches, selectedProfileId]);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel" style={{ width: "min(560px, 95vw)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0 }}>Stats</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <span style={{ fontWeight: 700 }}>Identity</span>
          <select
            value={selectedProfileId}
            onChange={(event) => setSelectedProfileId(event.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
          >
            {options.map((id) => (
              <option key={id} value={id}>
                {id === GUEST_ID ? "Guest" : (profiles.find((profile) => profile.id === id)?.name ?? id)}
              </option>
            ))}
          </select>
        </label>

        <h3 style={{ marginBottom: 8 }}>{selectedName}</h3>
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

        {activeProfileId === GUEST_ID && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            Create a profile to keep stats separate.
            <button type="button" onClick={onCreateProfile} style={{ marginLeft: 8 }}>Create Profile</button>
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
              const label = selectedProfileId === GUEST_ID ? "Guest" : selectedName;
              const confirmed = window.confirm(`Reset all stats for ${label}?`);
              if (!confirmed) return;
              clearProfileMatches(selectedProfileId);
              onReset();
            }}
          >
            {selectedProfileId === GUEST_ID ? "Reset Guest Stats" : "Reset Stats"}
          </button>
        </div>
      </div>
    </div>
  );
}
