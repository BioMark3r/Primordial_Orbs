import React from "react";
import type { ReplayEntryV1 } from "../utils/actionLog";
import { HistoryTypeIcon, historyTypeTone } from "../icons/history/historyIcons";

function formatPayload(payload: ReplayEntryV1["payload"]): string | null {
  if (payload == null) return null;
  if (typeof payload !== "object") return String(payload);

  const parts = Object.entries(payload as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function turnLabel(index: number): string {
  return `Turn ${index + 1}`;
}

export function TurnHistoryPanel(props: {
  entries: ReplayEntryV1[];
  onClose: () => void;
  onJumpToIndex: (index: number) => void;
  onJumpToStart: () => void;
  onJumpToLatest: () => void;
  previewIndex: number | null;
  isPreviewMode: boolean;
  onExitPreview: () => void;
}) {
  return (
    <aside className="historyPanel" role="complementary" aria-label="Turn History">
      <div className="historyHeader">
        <h3 className="historyTitle">Turn History</h3>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={props.onClose}>
          Close
        </button>
      </div>
      <div className="historyJumpBar" role="toolbar" aria-label="Replay navigation">
        <button type="button" className="ui-btn ui-btn--ghost" onClick={props.onJumpToStart}>
          Jump to Start
        </button>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={props.onJumpToLatest}>
          Jump to Latest
        </button>
      </div>
      {props.isPreviewMode && (
        <div className="historyPreviewBanner" role="status">
          Previewing {props.previewIndex === null || props.previewIndex < 0 ? "Start" : turnLabel(props.previewIndex)}.
          <button type="button" className="ui-btn ui-btn--ghost" onClick={props.onExitPreview}>
            Resume Live
          </button>
        </div>
      )}
      <div className="historyBody">
        {props.entries.length === 0 && <div className="historyEmpty">No recorded actions yet.</div>}
        {props.entries.map((entry, index) => {
          const payload = formatPayload(entry.payload);
          const isActive = props.previewIndex === index;
          const tone = historyTypeTone(entry.type);
          return (
            <article key={entry.id} className={`historyEntry${isActive ? " historyEntry--active" : ""}`}>
              <button type="button" className="historyEntry__jump" onClick={() => props.onJumpToIndex(index)}>
                Jump
              </button>
              <span className={`historyEntry__icon historyEntry__icon--${tone}`}>
                <HistoryTypeIcon entry={entry} />
              </span>
              <div className="historyEntry__content">
                <div className="historyEntry__head">
                  <span className="historyEntry__meta">{turnLabel(index)} • Player {entry.player + 1}</span>
                  <span className="historyEntry__index">{entry.type.replaceAll("_", " ")}</span>
                </div>
                {payload && <div className="historyEntry__payload">{payload}</div>}
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
