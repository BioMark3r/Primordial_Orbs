import type { Profile, ProfileId } from "../../profile/types";

type SplashLoginScreenProps = {
  logoUrl: string;
  profiles: Profile[];
  selectedProfileId: ProfileId | null;
  loginDisabled?: boolean;
  onProfileChange: (id: ProfileId | null) => void;
  onLogin: () => void;
  onRegister: () => void;
  onContinue: () => void;
};

export function SplashLoginScreen({
  logoUrl,
  profiles,
  selectedProfileId,
  loginDisabled,
  onProfileChange,
  onLogin,
  onRegister,
  onContinue,
}: SplashLoginScreenProps) {
  return (
    <div data-testid="screen-splash" style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 12 }}>
      <div style={{ width: "100%", maxWidth: 720, textAlign: "center" }}>
        <img
          src={logoUrl}
          alt="Primordial Orbs"
          style={{ width: "min(520px, 90vw)", height: "auto", borderRadius: 18, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        />
        <div style={{ marginTop: 16, fontWeight: 800, letterSpacing: 2 }}>PRIMORDIAL ORBS</div>
        <div style={{ marginTop: 6, color: "#666" }}>Select Profile → Enter PIN → Play</div>

        <div style={{ margin: "16px auto 0", maxWidth: 360, textAlign: "left" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Select Profile</span>
            <select
              value={selectedProfileId ?? ""}
              onChange={(event) => onProfileChange(event.target.value || null)}
              style={{ width: "100%", padding: 10, borderRadius: 10 }}
            >
              <option value="">Choose profile...</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" disabled={loginDisabled} onClick={onLogin} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Login
          </button>
          <button type="button" onClick={onRegister} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Register new user
          </button>
          <button type="button" onClick={onContinue} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
