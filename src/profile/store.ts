import { hashPin, isPinFormatValid, verifyPin } from "./crypto";
import type { MatchResult, Profile, ProfileId, Session } from "./types";
import { GUEST_ID } from "./types";

export const PROFILES_STORAGE_KEY = "po_profiles_v1";
export const SESSION_STORAGE_KEY = "po_session_v1";
export const MATCHES_STORAGE_KEY = "po_matches_v1";
export const REMEMBER_ME_WINDOW_MS = 12 * 60 * 60 * 1000;

const DEFAULT_SESSION: Session = { activeProfileId: GUEST_ID };

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function now(): number {
  return Date.now();
}

function persist<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfiles(): Profile[] {
  const value = parseJson<Profile[]>(localStorage.getItem(PROFILES_STORAGE_KEY), []);
  return Array.isArray(value) ? value : [];
}

export function saveProfiles(profiles: Profile[]): void {
  persist(PROFILES_STORAGE_KEY, profiles);
}

export function loadSession(): Session {
  const raw = parseJson<Partial<Session>>(localStorage.getItem(SESSION_STORAGE_KEY), DEFAULT_SESSION);
  if (!raw || typeof raw !== "object") return DEFAULT_SESSION;
  const activeProfileId = typeof raw.activeProfileId === "string" ? raw.activeProfileId : GUEST_ID;
  const unlockedUntil = typeof raw.unlockedUntil === "number" ? raw.unlockedUntil : undefined;

  if (activeProfileId === GUEST_ID) {
    return { activeProfileId: GUEST_ID };
  }

  if (unlockedUntil && unlockedUntil > now()) {
    return { activeProfileId, unlockedUntil };
  }

  return { activeProfileId };
}

export function saveSession(session: Session): void {
  persist(SESSION_STORAGE_KEY, session);
}

export function setGuestSession(): void {
  saveSession({ activeProfileId: GUEST_ID });
}

export function loadMatches(): MatchResult[] {
  const matches = parseJson<MatchResult[]>(localStorage.getItem(MATCHES_STORAGE_KEY), []);
  return Array.isArray(matches) ? matches : [];
}

export function saveMatches(matches: MatchResult[]): void {
  persist(MATCHES_STORAGE_KEY, matches);
}

export async function registerProfile(name: string, pin: string, rememberMe = true): Promise<Profile> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 16) {
    throw new Error("Name must be 2-16 characters.");
  }
  if (!isPinFormatValid(pin)) {
    throw new Error("PIN must be 4-8 digits.");
  }
  const profiles = loadProfiles();
  const normalized = trimmed.toLocaleLowerCase();
  if (profiles.some((profile) => profile.name.toLocaleLowerCase() === normalized)) {
    throw new Error("That profile name is already in use.");
  }
  const timestamp = now();
  const profile: Profile = {
    id: `p_${timestamp}_${Math.random().toString(36).slice(2, 10)}`,
    name: trimmed,
    pinHash: await hashPin(pin),
    createdAt: timestamp,
    lastActiveAt: timestamp,
  };
  saveProfiles([...profiles, profile]);
  saveSession(
    rememberMe
      ? { activeProfileId: profile.id, unlockedUntil: timestamp + REMEMBER_ME_WINDOW_MS }
      : { activeProfileId: profile.id },
  );
  return profile;
}

export async function verifyProfilePin(profileId: ProfileId, pin: string, rememberMe = true): Promise<boolean> {
  const profile = loadProfiles().find((item) => item.id === profileId);
  if (!profile) return false;
  const valid = await verifyPin(pin, profile.pinHash);
  if (!valid) return false;
  const timestamp = now();
  const profiles = loadProfiles().map((item) => (
    item.id === profileId ? { ...item, lastActiveAt: timestamp } : item
  ));
  saveProfiles(profiles);
  saveSession(
    rememberMe
      ? { activeProfileId: profileId, unlockedUntil: timestamp + REMEMBER_ME_WINDOW_MS }
      : { activeProfileId: profileId },
  );
  return true;
}

export function setActiveProfile(profileId: ProfileId, rememberMe = true): void {
  const timestamp = now();
  saveSession(rememberMe ? { activeProfileId: profileId, unlockedUntil: timestamp + REMEMBER_ME_WINDOW_MS } : { activeProfileId: profileId });
}

export function logout(): void {
  setGuestSession();
}

export function lockSession(): void {
  const raw = parseJson<Partial<Session>>(localStorage.getItem(SESSION_STORAGE_KEY), DEFAULT_SESSION);
  const activeProfileId = typeof raw.activeProfileId === "string" ? raw.activeProfileId : GUEST_ID;
  if (activeProfileId === GUEST_ID) {
    setGuestSession();
    return;
  }
  saveSession({ activeProfileId });
}

export function touchProfile(profileId: ProfileId): void {
  if (profileId === GUEST_ID) return;
  const profiles = loadProfiles();
  let changed = false;
  const timestamp = now();
  const next = profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    changed = true;
    return { ...profile, lastActiveAt: timestamp };
  });
  if (changed) saveProfiles(next);
}
