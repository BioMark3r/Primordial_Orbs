import React from "react";
import type { ImpactPreview } from "../utils/impactPreview";
import { impactIcon } from "../theme/assets";

export function ImpactPreviewPanel({ preview, onClose }: { preview: ImpactPreview; onClose?: () => void }) {
  const iconSrc = impactIcon[preview.impact];
  const impactName = formatImpactName(preview.impact);
  const modsDelta = preview.severityAfterMods - preview.baseSeverity;

  return (
    <div
      style={{
        border: "1px solid #bbb",
        borderRadius: 12,
        padding: 12,
        background: "#fdfbf7",
        minWidth: 260,
        maxWidth: 360,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Impact Preview</div>
        {onClose && (
          <button onClick={onClose} style={{ fontSize: 12 }}>
            Close
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        {iconSrc ? (
          <img src={iconSrc} alt={impactName} style={{ width: 36, height: 36 }} />
        ) : (
          <div style={{ width: 36, height: 36, display: "grid", placeItems: "center", fontWeight: 700 }}>
            {impactName[0]}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700 }}>{impactName}</div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Source: P{preview.source} • Target: P{preview.target}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2ddd3" }}>
        <div>
          <b>Severity:</b> {preview.severityAfterMods} (base {preview.baseSeverity} {formatModsDelta(modsDelta)})
        </div>
        <div style={{ marginTop: 4 }}>
          <b>Vulnerability:</b> +{preview.vulnerability}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 700 }}>Modifiers</div>
        {preview.modifiers.length === 0 ? (
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>No active modifiers.</div>
        ) : (
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            {preview.modifiers.map((mod, idx) => (
              <li key={`${mod.label}-${idx}`} style={{ fontSize: 12, marginBottom: 4 }}>
                {mod.label}
                {typeof mod.delta === "number" && (
                  <span style={{ marginLeft: 6, fontWeight: 700 }}>{formatSignedDelta(mod.delta)}</span>
                )}
                {mod.note && <span style={{ marginLeft: 6, color: "#666" }}>({mod.note})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview.highTechRedirectPossible && (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#f0f4ff", fontSize: 12 }}>
          <b>High-Tech may redirect</b> Meteor/Black Hole once per game.
        </div>
      )}

      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2ddd3" }}>
        <div style={{ fontWeight: 700 }}>Effect Summary</div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#333" }}>{preview.summary}</div>
      </div>
    </div>
  );
}

function formatImpactName(impact: string) {
  return impact
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatModsDelta(delta: number) {
  if (delta === 0) return "(+0 mods)";
  return `(${delta > 0 ? "+" : ""}${delta} mods)`;
}

function formatSignedDelta(delta: number) {
  if (delta === 0) return "0";
  return `${delta > 0 ? "+" : ""}${delta}`;
}
