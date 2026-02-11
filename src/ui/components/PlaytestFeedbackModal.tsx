import { useMemo } from "react";
import type { FeedbackAnswers } from "../utils/reportBundle";

const FEEDBACK_TAGS = [
  "Loved the impacts",
  "UI was confusing",
  "Too swingy",
  "Not enough choices",
  "Wanted to play again",
] as const;

type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

type Props = {
  open: boolean;
  value: FeedbackAnswers;
  onChange: (next: FeedbackAnswers) => void;
  onClose: () => void;
  onCopy: () => void;
};

export function PlaytestFeedbackModal(props: Props) {
  const { open, value, onChange, onClose, onCopy } = props;
  const selected = useMemo(() => new Set(value.selected ?? []), [value.selected]);
  if (!open) return null;

  function toggleTag(tag: FeedbackTag) {
    const next = new Set(selected);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    onChange({ ...value, selected: [...next] });
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Playtest feedback">
      <div className="overlay-panel" style={{ width: "min(640px, 94vw)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Quick feedback?</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Was it fun?</span>
            <select
              value={value.fun}
              onChange={(event) => onChange({ ...value, fun: event.target.value as FeedbackAnswers["fun"] })}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="yes">Yes</option>
              <option value="unsure">Unsure</option>
              <option value="no">No</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Was it clear what to do?</span>
            <select
              value={value.clarity}
              onChange={(event) => onChange({ ...value, clarity: event.target.value as FeedbackAnswers["clarity"] })}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="clear">Clear</option>
              <option value="mixed">Mixed</option>
              <option value="confusing">Confusing</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Difficulty felt…</span>
            <select
              value={value.difficulty}
              onChange={(event) =>
                onChange({ ...value, difficulty: event.target.value as FeedbackAnswers["difficulty"] })
              }
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="easy">Easy</option>
              <option value="ok">OK</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <fieldset style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 10 }}>
            <legend style={{ padding: "0 6px", fontWeight: 700 }}>Tags</legend>
            <div style={{ display: "grid", gap: 8 }}>
              {FEEDBACK_TAGS.map((tag) => (
                <label key={tag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Comments</span>
            <textarea
              value={value.comments}
              onChange={(event) => onChange({ ...value, comments: event.target.value.slice(0, 500) })}
              rows={5}
              maxLength={500}
              placeholder="Anything else to share?"
              style={{ width: "100%", resize: "vertical", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onCopy}>Copy Feedback + Report Bundle</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
