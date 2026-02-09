import React from "react";
import type { ImpactPreview } from "../utils/impactPreview";
import { impactIcon } from "../theme/assets";

export function ImpactPreviewPanel({ preview, onClose }: { preview: ImpactPreview; onClose?: () => void }) {
  const iconSrc = impactIcon[preview.impact];
  const impactName = formatImpactName(preview.impact);
  const modsDelta = preview.severityAfterMods - preview.baseSeverity;
  const severityEquation = [
    `base (1+vuln=${preview.baseSeverity})`,
    preview.lavaBoostApplied ? "+ lava" : null,
    preview.waterWeaknessApplied ? "+ water weakness" : null,
    preview.iceShieldApplied ? "− ice shield" : null,
    preview.plantMitigationApplied ? "− plant" : null,
  ]
    .filter((part): part is string => !!part)
    .join(" ");

  const modifierChips = [
    {
      key: "lava",
      label: "Lava +1",
      applied: preview.lavaBoostApplied,
      tone: "good",
    },
    {
      key: "water",
      label: "Water (Disease) +1",
      applied: preview.waterWeaknessApplied,
      tone: "warn",
    },
    {
      key: "ice",
      label: "Ice −1",
      applied: preview.iceShieldApplied,
      tone: "info",
    },
    {
      key: "plant",
      label: "Plant −1",
      applied: preview.plantMitigationApplied,
      tone: "info",
    },
    {
      key: "land",
      label: "Land weakness +1 terraform",
      applied: preview.landWeaknessApplied,
      tone: "warn",
    },
    {
      key: "solar",
      label: "Solar Flare: abilities disabled",
      applied: preview.solarFlareActive || preview.impact === "SOLAR_FLARE",
      tone: "warn",
    },
    {
      key: "tech",
      label: "High-Tech redirect possible",
      applied: preview.highTechRedirectPossible,
      tone: "good",
    },
  ].filter((chip) => chip.applied);
  const modifierNotes = preview.modifiers.filter((mod) => mod.note);

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
        <div style={{ marginTop: 4, fontSize: 12, color: "#5a4b3d" }}>
          Severity = {severityEquation} (min 1)
        </div>
        <div style={{ marginTop: 4 }}>
          <b>Vulnerability:</b> +{preview.vulnerability}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 700 }}>Modifiers</div>
        {modifierChips.length === 0 && preview.modifiers.length === 0 ? (
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>No active modifiers.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {modifierChips.map((chip) => (
              <span
                key={chip.key}
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: chip.tone === "warn" ? "#c95c2b" : chip.tone === "good" ? "#1d7a4d" : "#3562b0",
                  background:
                    chip.tone === "warn"
                      ? "rgba(201, 92, 43, 0.12)"
                      : chip.tone === "good"
                      ? "rgba(29, 122, 77, 0.12)"
                      : "rgba(53, 98, 176, 0.12)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#26201a",
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
        {modifierNotes.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#6b5e52" }}>
            {modifierNotes.map((mod, idx) => (
              <div key={`${mod.label}-${idx}`}>{mod.note}</div>
            ))}
          </div>
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
