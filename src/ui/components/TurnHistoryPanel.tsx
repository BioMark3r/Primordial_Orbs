import React from "react";
import type { ReplayEntryV1 } from "../utils/actionLog";

function formatPayload(payload: ReplayEntryV1["payload"]): string | null {
  if (payload == null) return null;
  if (typeof payload !== "object") return String(payload);

  const parts = Object.entries(payload as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function TurnHistoryPanel(props: { entries: ReplayEntryV1[]; onClose: () => void }) {
  return (
    <aside className="historyPanel" role="complementary" aria-label="Turn History">
      <div className="historyHeader">
        <h3 className="historyTitle">Turn History</h3>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={props.onClose}>
          Close
        </button>
      </div>
      <div className="historyBody">
        {props.entries.length === 0 && <div className="historyEmpty">No recorded actions yet.</div>}
        {props.entries.map((entry, index) => {
          const payload = formatPayload(entry.payload);
          return (
            <article key={entry.id} className="historyEntry">
              <div className="historyEntry__head">
                <span className="historyEntry__index">#{index + 1}</span>
                <span className="historyEntry__meta">P{entry.player + 1} · T{entry.type}</span>
              </div>
              {payload && <div className="historyEntry__payload">{payload}</div>}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
