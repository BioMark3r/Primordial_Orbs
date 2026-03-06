export type UserSettings = {
  masterMuted: boolean;
  sfxEnabled: boolean;
  sfxVolume: number;
  ambientEnabled: boolean;
  ambientVolume: number;
  reduceMotion: boolean;
};

const SETTINGS_KEY = "po_settings_v1";

const DEFAULT_SFX_VOLUME = 0.55;
const DEFAULT_AMBIENT_VOLUME = 0.3;

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

export function defaultSettings(): UserSettings {
  return {
    masterMuted: false,
    sfxEnabled: true,
    sfxVolume: DEFAULT_SFX_VOLUME,
    ambientEnabled: false,
    ambientVolume: DEFAULT_AMBIENT_VOLUME,
    reduceMotion: defaultReduceMotion(),
  };
}

export function loadSettings(): UserSettings {
  const fallback = defaultSettings();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UserSettings> & {
      soundEnabled?: boolean;
      volume?: number;
    };
    const migratedSfxEnabled =
      typeof parsed.sfxEnabled === "boolean"
        ? parsed.sfxEnabled
        : (typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : fallback.sfxEnabled);
    const migratedSfxVolume =
      typeof parsed.sfxVolume === "number"
        ? clamp01(parsed.sfxVolume)
        : (typeof parsed.volume === "number" ? clamp01(parsed.volume) : fallback.sfxVolume);

    return {
      masterMuted: typeof parsed.masterMuted === "boolean" ? parsed.masterMuted : fallback.masterMuted,
      sfxEnabled: migratedSfxEnabled,
      sfxVolume: migratedSfxVolume,
      ambientEnabled: typeof parsed.ambientEnabled === "boolean" ? parsed.ambientEnabled : fallback.ambientEnabled,
      ambientVolume: typeof parsed.ambientVolume === "number" ? clamp01(parsed.ambientVolume) : fallback.ambientVolume,
      reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : fallback.reduceMotion,
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(s: UserSettings): void {
  if (typeof window === "undefined") return;
  const sanitized: UserSettings = {
    masterMuted: Boolean(s.masterMuted),
    sfxEnabled: Boolean(s.sfxEnabled),
    sfxVolume: clamp01(s.sfxVolume),
    ambientEnabled: Boolean(s.ambientEnabled),
    ambientVolume: clamp01(s.ambientVolume),
    reduceMotion: Boolean(s.reduceMotion),
  };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore storage failures
  }
}
