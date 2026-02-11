import { useState } from "react";

type PinPromptModalProps = {
  open: boolean;
  profileName: string;
  error?: string | null;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
};

export function PinPromptModal({ open, profileName, error, onClose, onSubmit }: PinPromptModalProps) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel" style={{ width: "min(360px, 94vw)" }}>
        <h3 style={{ marginTop: 0 }}>Enter PIN for {profileName}</h3>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D+/g, ""))}
          placeholder="4-8 digits"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        {error && <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(pin);
                setPin("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
