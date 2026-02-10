import type { UserSettings } from "./settings";
import { clamp01 } from "./settings";

export type SfxName =
  | "click"
  | "orb_place"
  | "impact_cast"
  | "impact_land"
  | "unlock"
  | "end_play"
  | "advance"
  | "error";

type SfxOptions = { volumeMul?: number };

let audioUnlocked = false;

const audioMap: Record<SfxName, HTMLAudioElement> = {
  click: new Audio("/sfx/click.mp3"),
  orb_place: new Audio("/sfx/orb_place.mp3"),
  impact_cast: new Audio("/sfx/impact_cast.mp3"),
  impact_land: new Audio("/sfx/impact_land.mp3"),
  unlock: new Audio("/sfx/unlock.mp3"),
  end_play: new Audio("/sfx/end_play.mp3"),
  advance: new Audio("/sfx/advance.mp3"),
  error: new Audio("/sfx/error.mp3"),
};

Object.values(audioMap).forEach((audio) => {
  audio.preload = "auto";
});

export function initAudioUnlock(): void {
  audioUnlocked = true;
}

export function playSfx(name: SfxName, settings: UserSettings, opts?: SfxOptions): void {
  if (!settings.soundEnabled) return;
  if (!audioUnlocked) return;
  const audio = audioMap[name];
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.volume = clamp01(settings.volume * (opts?.volumeMul ?? 1));
    void audio.play().catch(() => {
      // swallow autoplay/decode issues (e.g., Safari quirks or placeholder assets)
    });
  } catch {
    // never throw from audio
  }
}
