import type { UserSettings } from "./settings";
import { clamp01 } from "./settings";

export type SfxName =
  | "click"
  | "orbPlace"
  | "impactCast"
  | "impactLand"
  | "unlock"
  | "endPlay"
  | "draw"
  | "error";

type SfxOptions = { volumeMul?: number };

const AUDIO_DEBUG = import.meta.env.DEV;

let audioUnlocked = false;
const missingLogged = new Set<SfxName>();

/**
 * Legacy helper manifest. Keep this aligned with src/audio/audioManifest.ts.
 */
const legacySfxManifest: Record<SfxName, string | null> = {
  click: "sfx/click.mp3",
  orbPlace: "sfx/orb_place.mp3",
  impactCast: "sfx/impact_cast.mp3",
  impactLand: "sfx/impact_land.mp3",
  unlock: "sfx/unlock.mp3",
  endPlay: "sfx/end_play.mp3",
  draw: "sfx/draw.mp3",
  error: "sfx/error.mp3",
};

const audioMap: Partial<Record<SfxName, HTMLAudioElement>> = {};

function getAudio(name: SfxName): HTMLAudioElement | null {
  const existing = audioMap[name];
  if (existing) return existing;

  const path = legacySfxManifest[name];
  if (!path) {
    if (AUDIO_DEBUG && !missingLogged.has(name)) {
      missingLogged.add(name);
      console.debug(`[audio:legacy] SFX "${name}" is unconfigured; skipping.`);
    }
    return null;
  }

  const audio = new Audio(path);
  audio.preload = "auto";
  audioMap[name] = audio;
  return audio;
}

export function initAudioUnlock(): void {
  audioUnlocked = true;
}

export function playSfx(name: SfxName, settings: UserSettings, opts?: SfxOptions): void {
  if (!settings.soundEnabled) return;
  if (!audioUnlocked) return;
  const audio = getAudio(name);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.volume = clamp01(settings.volume * (opts?.volumeMul ?? 1));
    void audio.play().catch(() => {
      // swallow autoplay/decode issues
    });
  } catch {
    // never throw from audio
  }
}
