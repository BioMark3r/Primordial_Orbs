import { assetUrl } from "../ui/utils/assetUrl";

export type SfxName =
  | "ui_click"
  | "ui_hover"
  | "draw"
  | "orb_select"
  | "orb_play"
  | "impact_cast"
  | "hit"
  | "shield"
  | "combo"
  | "turn_end"
  | "invalid"
  | "victory"
  | "defeat";

type SfxOptions = { volumeMul?: number };

type AudioState = {
  masterMuted: boolean;
  sfxEnabled: boolean;
  ambientEnabled: boolean;
  sfxVolume: number;
  ambientVolume: number;
};

const AUDIO_DEBUG = import.meta.env.DEV;

const VOICE_POOL_SIZE = 3;

const sfxPaths: Record<SfxName, string> = {
  ui_click: "sfx/click.mp3",
  ui_hover: "sfx/click.mp3",
  draw: "sfx/click.mp3",
  orb_select: "sfx/click.mp3",
  orb_play: "sfx/orb_place.mp3",
  impact_cast: "sfx/impact_cast.mp3",
  hit: "sfx/impact_land.mp3",
  shield: "sfx/unlock.mp3",
  combo: "sfx/unlock.mp3",
  turn_end: "sfx/end_play.mp3",
  invalid: "sfx/error.mp3",
  victory: "sfx/unlock.mp3",
  defeat: "sfx/error.mp3",
};

const disabledSfx = new Set<SfxName>();
const warnedAssetUrls = new Set<string>();
const sfxVoices = new Map<SfxName, HTMLAudioElement[]>();
const sfxVoiceIndex = new Map<SfxName, number>();

const ambientAudio = new Audio(assetUrl("sfx/advance.mp3"));
ambientAudio.preload = "auto";
ambientAudio.loop = true;

let isAudioUnlocked = false;
let pendingAmbientStart = false;
let unlockInFlight = false;

const state: AudioState = {
  masterMuted: false,
  sfxEnabled: true,
  ambientEnabled: false,
  sfxVolume: 0.55,
  ambientVolume: 0.3,
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function warnOnce(message: string, url: string): void {
  if (warnedAssetUrls.has(url)) return;
  warnedAssetUrls.add(url);
  console.warn(message);
}

function debugLog(message: string, ...details: unknown[]): void {
  if (!AUDIO_DEBUG) return;
  console.debug(`[audio] ${message}`, ...details);
}

function effectiveVolume(volume: number): number {
  if (state.masterMuted) return 0;
  return clamp01(volume);
}

function initSfxVoices(name: SfxName): HTMLAudioElement[] {
  const existing = sfxVoices.get(name);
  if (existing) return existing;

  const src = assetUrl(sfxPaths[name]);
  const voices = Array.from({ length: VOICE_POOL_SIZE }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      disabledSfx.add(name);
      warnOnce(`[audio] Failed to load SFX: ${src}`, src);
    });
    audio.addEventListener("canplaythrough", () => {
      debugLog(`Loaded SFX \"${name}\" from ${src}`);
    }, { once: true });
    return audio;
  });

  sfxVoices.set(name, voices);
  sfxVoiceIndex.set(name, 0);
  return voices;
}

function updateAmbientVolume(): void {
  ambientAudio.volume = effectiveVolume(state.ambientEnabled ? state.ambientVolume : 0);
}

function requestAmbientStart(): void {
  pendingAmbientStart = state.ambientEnabled;
}

function tryStartAmbient(): void {
  if (!isAudioUnlocked || !state.ambientEnabled || state.masterMuted) return;
  updateAmbientVolume();
  debugLog("Attempting ambient playback", { src: ambientAudio.src, volume: ambientAudio.volume });
  void ambientAudio.play().catch(() => {
    warnOnce(`[audio] Ambient playback blocked: ${ambientAudio.src}`, ambientAudio.src);
  });
}

ambientAudio.addEventListener("error", () => {
  state.ambientEnabled = false;
  pendingAmbientStart = false;
  warnOnce(`[audio] Failed to load ambient track: ${ambientAudio.src}`, ambientAudio.src);
});

export function initAudio(): void {
  debugLog("Initializing audio manager", { baseUrl: import.meta.env.BASE_URL });
  (Object.keys(sfxPaths) as SfxName[]).forEach((name) => {
    initSfxVoices(name);
  });
  updateAmbientVolume();
}

export function unlockAudio(): void {
  if (isAudioUnlocked || unlockInFlight) return;
  unlockInFlight = true;

  const probe = initSfxVoices("ui_click")[0];
  const previousVolume = probe.volume;
  probe.volume = 0;
  probe.currentTime = 0;

  debugLog("Attempting audio unlock");

  void probe.play()
    .then(() => {
      probe.pause();
      probe.currentTime = 0;
      probe.volume = previousVolume;
      isAudioUnlocked = true;
      unlockInFlight = false;
      debugLog("Audio unlock succeeded");
      if (pendingAmbientStart || state.ambientEnabled) {
        tryStartAmbient();
        pendingAmbientStart = false;
      }
    })
    .catch(() => {
      probe.volume = previousVolume;
      unlockInFlight = false;
      debugLog("Audio unlock blocked; waiting for another user gesture");
    });
}

export function getAudioUnlocked(): boolean {
  return isAudioUnlocked;
}

export function playSfx(name: SfxName, opts?: SfxOptions): void {
  if (!isAudioUnlocked) {
    debugLog(`Skipped SFX \"${name}\" because audio is still locked`);
    return;
  }
  if (state.masterMuted || !state.sfxEnabled || disabledSfx.has(name)) return;

  const voices = initSfxVoices(name);
  const nextIndex = sfxVoiceIndex.get(name) ?? 0;
  const voice = voices[nextIndex];
  sfxVoiceIndex.set(name, (nextIndex + 1) % voices.length);

  try {
    voice.pause();
    voice.currentTime = 0;
    voice.volume = effectiveVolume(state.sfxVolume * (opts?.volumeMul ?? 1));
    debugLog(`Playing SFX \"${name}\"`, { volume: voice.volume, src: voice.src });
    void voice.play().catch(() => {
      debugLog(`Playback blocked for SFX \"${name}\"`, { src: voice.src });
    });
  } catch {
    debugLog(`Playback failed for SFX \"${name}\"`);
  }
}

export function startAmbient(): void {
  state.ambientEnabled = true;
  updateAmbientVolume();
  if (!isAudioUnlocked) {
    requestAmbientStart();
    return;
  }
  tryStartAmbient();
}

export function stopAmbient(): void {
  state.ambientEnabled = false;
  pendingAmbientStart = false;
  ambientAudio.pause();
  ambientAudio.currentTime = 0;
  updateAmbientVolume();
}

export function setMasterMuted(muted: boolean): void {
  state.masterMuted = Boolean(muted);
  if (state.masterMuted) {
    ambientAudio.pause();
  } else if (state.ambientEnabled && isAudioUnlocked) {
    tryStartAmbient();
  }
  updateAmbientVolume();
}

export function setSfxEnabled(enabled: boolean): void {
  state.sfxEnabled = Boolean(enabled);
}

export function setAmbientEnabled(enabled: boolean): void {
  if (enabled) {
    startAmbient();
    return;
  }
  stopAmbient();
}

export function setSfxVolume(volume: number): void {
  state.sfxVolume = clamp01(volume);
}

export function setAmbientVolume(volume: number): void {
  state.ambientVolume = clamp01(volume);
  updateAmbientVolume();
}
