export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function pushHistory<T>(history: HistoryState<T>, nextPresent: T, limit: number): HistoryState<T> {
  const past = [...history.past, history.present];
  const cappedPast = limit > 0 ? past.slice(-limit) : past;
  return { past: cappedPast, present: nextPresent, future: [] };
}

export function undo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  const future = [history.present, ...history.future];
  return { past, present: previous, future };
}

export function redo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  const future = history.future.slice(1);
  const past = [...history.past, history.present];
  return { past, present: next, future };
}
