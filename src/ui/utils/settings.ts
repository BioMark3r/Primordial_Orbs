export type UserSettings = {
  soundEnabled: boolean;
  volume: number;
  reduceMotion: boolean;
};

const SETTINGS_KEY = "po_settings_v1";

const DEFAULT_VOLUME = 0.55;

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function defaultReduceMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function loadSettings(): UserSettings {
  const fallback: UserSettings = {
    soundEnabled: true,
    volume: DEFAULT_VOLUME,
    reduceMotion: defaultReduceMotion(),
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : fallback.soundEnabled,
      volume: typeof parsed.volume === "number" ? clamp01(parsed.volume) : fallback.volume,
      reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : fallback.reduceMotion,
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(s: UserSettings): void {
  if (typeof window === "undefined") return;
  const sanitized: UserSettings = {
    soundEnabled: Boolean(s.soundEnabled),
    volume: clamp01(s.volume),
    reduceMotion: Boolean(s.reduceMotion),
  };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore storage failures
  }
}
