import { useState } from "react";

type RegisterProfileModalProps = {
  open: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string, pin: string) => Promise<void>;
};

export function RegisterProfileModal({ open, error, onClose, onSubmit }: RegisterProfileModalProps) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel" style={{ width: "min(420px, 95vw)" }}>
        <h3 style={{ marginTop: 0 }}>Register New Profile</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name (2-16 chars)"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D+/g, ""))}
            placeholder="PIN (4-8 digits)"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D+/g, ""))}
            placeholder="Confirm PIN"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>
        {(localError || error) && (
          <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{localError ?? error}</div>
        )}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setLocalError(null);
              if (pin !== confirmPin) {
                setLocalError("PIN confirmation does not match.");
                return;
              }
              setBusy(true);
              try {
                await onSubmit(name, pin);
                setName("");
                setPin("");
                setConfirmPin("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
