import React, { useEffect, useMemo, useState } from "react";
import type { Toast } from "../utils/toasts";
import { removeToast, subscribeToasts } from "../utils/toasts";

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 2500;

export function ToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  const visibleToasts = useMemo(() => toasts.slice(0, MAX_VISIBLE), [toasts]);

  useEffect(() => {
    if (visibleToasts.length === 0) return;
    const timers = visibleToasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visibleToasts]);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {visibleToasts.map((toast) => (
        <div key={toast.id} className={`toast ui-toast toast--${toast.tone}`}>
          <div className="toast__body">
            <div className="toast__title">{toast.title}</div>
            {toast.detail && <div className="toast__detail">{toast.detail}</div>}
          </div>
          <button className="toast__close ui-btn ui-btn--ghost" onClick={() => removeToast(toast.id)} aria-label="Dismiss toast">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
