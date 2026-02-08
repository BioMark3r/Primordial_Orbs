import React from "react";
import type { CoachHint } from "../utils/coach";

const toneStyles: Record<CoachHint["tone"], React.CSSProperties> = {
  info: {
    borderColor: "#cfd6de",
    background: "#f6f8fb",
    color: "#253042",
  },
  warn: {
    borderColor: "#f2c283",
    background: "#fff4e5",
    color: "#6b3a00",
  },
  good: {
    borderColor: "#9ad3b0",
    background: "#e9f7ef",
    color: "#1e5a38",
  },
};

type CoachStripProps = {
  hints: CoachHint[];
  onAction?: (hint: CoachHint) => void;
  isActionDisabled?: (hint: CoachHint) => boolean;
};

export function CoachStrip({ hints, onAction, isActionDisabled }: CoachStripProps) {
  if (hints.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
        border: "1px solid #e0e0e0",
        borderRadius: 10,
        background: "#fafafa",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
      aria-label="Coach hints"
    >
      <div style={{ fontWeight: 700, fontSize: 12, color: "#444" }}>Coach</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {hints.map((hint, index) => {
          const disabled = isActionDisabled?.(hint) ?? false;
          return (
            <div
              key={`${hint.title}-${index}`}
              style={{
                ...toneStyles[hint.tone],
                borderWidth: 1,
                borderStyle: "solid",
                borderRadius: 999,
                padding: "4px 10px",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span>{hint.title}</span>
              {hint.detail && <span style={{ opacity: 0.85 }}>{hint.detail}</span>}
              {hint.actionLabel && (
                <button
                  type="button"
                  disabled={disabled || !onAction}
                  onClick={() => onAction?.(hint)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.2)",
                    padding: "2px 8px",
                    fontSize: 11,
                    background: disabled ? "#eee" : "#fff",
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {hint.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
