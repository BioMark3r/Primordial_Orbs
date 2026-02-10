import type { GameState } from "../../engine/types";

const TRANSIENT_KEYS = new Set(["_ui", "ui", "debug", "timestamp", "updatedAt"]);

function normalizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "__NaN__";
    if (value === Infinity) return "__Infinity__";
    if (value === -Infinity) return "__-Infinity__";
    return value;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (Array.isArray(value)) {
    const normalized: unknown[] = [];
    for (const item of value) {
      const next = normalizeValue(item, seen);
      normalized.push(next === undefined ? null : next);
    }
    return normalized;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) {
      return "__CYCLE__";
    }
    seen.add(obj);
    const keys = Object.keys(obj).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      if (TRANSIENT_KEYS.has(key)) continue;
      if (key === "at" || key.endsWith("Timestamp") || key.endsWith("At")) {
        continue;
      }
      const next = normalizeValue(obj[key], seen);
      if (next !== undefined) {
        normalized[key] = next;
      }
    }
    seen.delete(obj);
    return normalized;
  }
  return String(value);
}

export function stableStringify(obj: unknown): string {
  const normalized = normalizeValue(obj, new WeakSet<object>());
  return JSON.stringify(normalized);
}

export function hashFNV1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeStateForDigest(state: GameState): unknown {
  return normalizeValue(state, new WeakSet<object>());
}

export function digestState(state: GameState): { hash: string; bytes: number } {
  const stable = stableStringify(normalizeStateForDigest(state));
  const bytes = new TextEncoder().encode(stable).length;
  return {
    hash: hashFNV1a(stable),
    bytes,
  };
}
