import type { Profile, ProfileId } from "../../profile/types";

type SplashLoginScreenProps = {
  logoUrl: string;
  profiles: Profile[];
  selectedProfileId: ProfileId | null;
  loginDisabled?: boolean;
  rememberMe: boolean;
  onRememberMeChange: (remember: boolean) => void;
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
  rememberMe,
  onRememberMeChange,
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

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div style={{ border: "1px solid #d4d4d8", borderRadius: 12, padding: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 700 }}>Continue as Guest</div>
            <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>Play instantly. Create a profile later to keep stats.</div>
            <button type="button" onClick={onContinue} style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10 }}>
              Continue as Guest
            </button>
          </div>

          <div style={{ border: "1px solid #d4d4d8", borderRadius: 12, padding: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 700 }}>Login to Profile</div>
            <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>Profiles use a PIN to keep stats separate on this device.</div>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
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

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input type="checkbox" checked={rememberMe} onChange={(event) => onRememberMeChange(event.target.checked)} />
              <span>Remember me on this device</span>
            </label>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" disabled={loginDisabled} onClick={onLogin} style={{ padding: "10px 14px", borderRadius: 10 }}>
                Login
              </button>
              <button type="button" onClick={onRegister} style={{ padding: "10px 14px", borderRadius: 10 }}>
                Create Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
