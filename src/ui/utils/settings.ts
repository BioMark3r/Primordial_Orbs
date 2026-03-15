export type UserSettings = {
  masterMuted: boolean;
  sfxEnabled: boolean;
  sfxVolume: number;
  ambientEnabled: boolean;
  ambientVolume: number;
  reduceMotion: boolean;
};

const SETTINGS_KEY = "po_settings_v1";

const DEFAULT_SFX_VOLUME = 0.9;
const DEFAULT_AMBIENT_VOLUME = 0.15;

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function parseVolume(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return clamp01(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return clamp01(parsed);
  }
  return fallback;
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
    const migratedSfxEnabled = parseBoolean(parsed.sfxEnabled, parseBoolean(parsed.soundEnabled, fallback.sfxEnabled));
    const migratedSfxVolume = parseVolume(parsed.sfxVolume, parseVolume(parsed.volume, fallback.sfxVolume));

    return {
      masterMuted: parseBoolean(parsed.masterMuted, fallback.masterMuted),
      sfxEnabled: migratedSfxEnabled,
      sfxVolume: migratedSfxVolume,
      ambientEnabled: parseBoolean(parsed.ambientEnabled, fallback.ambientEnabled),
      ambientVolume: parseVolume(parsed.ambientVolume, fallback.ambientVolume),
      reduceMotion: parseBoolean(parsed.reduceMotion, fallback.reduceMotion),
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
