import type { Core } from "../../engine/types";
import type { AiPersonality } from "../../ai/aiTypes";

export type SetupMode = "HOTSEAT" | "CPU";
export type SetupDensity = "cozy" | "compact";

export type SetupConfig = {
  mode: SetupMode;
  coreP0: Core;
  coreP1: Core;
  seed: number;
  aiPersonality: AiPersonality;
  aiSpeed: "FAST" | "NORMAL";
  density: SetupDensity;
};

const CORE_OPTIONS: readonly Core[] = ["LAND", "WATER", "ICE", "LAVA", "GAS"];
const MODE_OPTIONS: readonly SetupMode[] = ["HOTSEAT", "CPU"];
const AI_PERSONALITY_OPTIONS: readonly AiPersonality[] = ["BALANCED", "BUILDER", "AGGRESSIVE"];
const AI_SPEED_OPTIONS: readonly SetupConfig["aiSpeed"][] = ["FAST", "NORMAL"];
const DENSITY_OPTIONS: readonly SetupDensity[] = ["cozy", "compact"];

export const DEFAULT_SETUP_CONFIG: SetupConfig = {
  mode: "HOTSEAT",
  coreP0: "LAND",
  coreP1: "ICE",
  seed: 1,
  aiPersonality: "BALANCED",
  aiSpeed: "NORMAL",
  density: "cozy",
};

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function padBase64(input: string): string {
  const padding = input.length % 4;
  if (padding === 0) return input;
  return `${input}${"=".repeat(4 - padding)}`;
}

export function normalizeSetupConfig(input: Partial<SetupConfig> | null | undefined): SetupConfig {
  const source = input ?? {};
  return {
    mode: asEnum(source.mode, MODE_OPTIONS, DEFAULT_SETUP_CONFIG.mode),
    coreP0: asEnum(source.coreP0, CORE_OPTIONS, DEFAULT_SETUP_CONFIG.coreP0),
    coreP1: asEnum(source.coreP1, CORE_OPTIONS, DEFAULT_SETUP_CONFIG.coreP1),
    seed: asFiniteNumber(source.seed, DEFAULT_SETUP_CONFIG.seed),
    aiPersonality: asEnum(
      source.aiPersonality,
      AI_PERSONALITY_OPTIONS,
      DEFAULT_SETUP_CONFIG.aiPersonality
    ),
    aiSpeed: asEnum(source.aiSpeed, AI_SPEED_OPTIONS, DEFAULT_SETUP_CONFIG.aiSpeed),
    density: asEnum(source.density, DENSITY_OPTIONS, DEFAULT_SETUP_CONFIG.density),
  };
}

export function encodeSetupConfig(cfg: SetupConfig): string {
  const json = JSON.stringify(cfg);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeSetupConfig(s: string): SetupConfig | null {
  if (!s) return null;
  try {
    const base64 = padBase64(s.replace(/-/g, "+").replace(/_/g, "/"));
    const json = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeSetupConfig(parsed as Partial<SetupConfig>);
  } catch {
    return null;
  }
}

export function buildShareUrl(cfg: SetupConfig, opts?: { autostart?: boolean }): string {
  const params = new URLSearchParams();
  params.set("cfg", encodeSetupConfig(cfg));
  if (opts?.autostart) {
    params.set("autostart", "1");
  }
  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
}
