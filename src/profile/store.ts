import { hashPin, isPinFormatValid, verifyPin } from "./crypto";
import type { MatchResult, Profile, ProfileId, Session } from "./types";

export const PROFILES_STORAGE_KEY = "po_profiles_v1";
export const SESSION_STORAGE_KEY = "po_session_v1";
export const MATCHES_STORAGE_KEY = "po_matches_v1";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

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
  const session = parseJson<Session>(localStorage.getItem(SESSION_STORAGE_KEY), { activeProfileId: null });
  if (!session || typeof session !== "object") return { activeProfileId: null };
  const unlockedUntil = typeof session.unlockedUntil === "number" ? session.unlockedUntil : undefined;
  if (!unlockedUntil || unlockedUntil <= now()) {
    return { activeProfileId: null };
  }
  return {
    activeProfileId: typeof session.activeProfileId === "string" ? session.activeProfileId : null,
    unlockedUntil,
  };
}

export function saveSession(session: Session): void {
  persist(SESSION_STORAGE_KEY, session);
}

export function loadMatches(): MatchResult[] {
  const matches = parseJson<MatchResult[]>(localStorage.getItem(MATCHES_STORAGE_KEY), []);
  return Array.isArray(matches) ? matches : [];
}

export function saveMatches(matches: MatchResult[]): void {
  persist(MATCHES_STORAGE_KEY, matches);
}

export async function registerProfile(name: string, pin: string): Promise<Profile> {
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
  const next = [...profiles, profile];
  saveProfiles(next);
  saveSession({ activeProfileId: profile.id, unlockedUntil: timestamp + SESSION_TTL_MS });
  return profile;
}

export async function verifyProfilePin(profileId: ProfileId, pin: string): Promise<boolean> {
  const profile = loadProfiles().find((item) => item.id === profileId);
  if (!profile) return false;
  const valid = await verifyPin(pin, profile.pinHash);
  if (!valid) return false;
  const timestamp = now();
  const profiles = loadProfiles().map((item) => (
    item.id === profileId ? { ...item, lastActiveAt: timestamp } : item
  ));
  saveProfiles(profiles);
  saveSession({ activeProfileId: profileId, unlockedUntil: timestamp + SESSION_TTL_MS });
  return true;
}

export function setActiveProfile(profileId: ProfileId): void {
  saveSession({ activeProfileId: profileId, unlockedUntil: now() + SESSION_TTL_MS });
}

export function logout(): void {
  saveSession({ activeProfileId: null });
}

export function lockSession(): void {
  const raw = parseJson<Session>(localStorage.getItem(SESSION_STORAGE_KEY), { activeProfileId: null });
  const activeProfileId = raw && typeof raw.activeProfileId === "string" ? raw.activeProfileId : null;
  saveSession({ activeProfileId });
}

export function touchProfile(profileId: ProfileId): void {
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
