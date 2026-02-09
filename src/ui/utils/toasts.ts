export type Toast = {
  id: string;
  tone: "info" | "good" | "warn";
  title: string;
  detail?: string;
  at: number;
};

type ToastListener = (toasts: Toast[]) => void;

const listeners = new Set<ToastListener>();
let toasts: Toast[] = [];
const uniqueCache = new Map<string, number>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function subscribeToasts(listener: ToastListener) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return toasts;
}

export function removeToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function pushToast(toast: Toast) {
  toasts = [toast, ...toasts].slice(0, 8);
  emit();
}

export function pushUniqueToast(key: string, toast: Toast, ttlMs = 1500) {
  const now = Date.now();
  const last = uniqueCache.get(key);
  if (last !== undefined && now - last < ttlMs) {
    return;
  }
  uniqueCache.set(key, now);
  for (const [cachedKey, cachedAt] of uniqueCache.entries()) {
    if (now - cachedAt > ttlMs * 2) {
      uniqueCache.delete(cachedKey);
    }
  }
  pushToast(toast);
}
