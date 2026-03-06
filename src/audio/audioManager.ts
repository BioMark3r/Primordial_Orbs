import { assetUrl } from "../ui/utils/assetUrl";

export type SfxName =
  | "ui_hover"
  | "orb_select"
  | "orb_play"
  | "hit"
  | "shield"
  | "combo"
  | "turn_end"
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

const VOICE_POOL_SIZE = 3;

const sfxPaths: Record<SfxName, string> = {
  ui_hover: "audio/sfx/ui_hover.ogg",
  orb_select: "audio/sfx/orb_select.ogg",
  orb_play: "audio/sfx/orb_play.ogg",
  hit: "audio/sfx/hit.ogg",
  shield: "audio/sfx/shield.ogg",
  combo: "audio/sfx/combo.ogg",
  turn_end: "audio/sfx/turn_end.ogg",
  victory: "audio/sfx/victory.ogg",
  defeat: "audio/sfx/defeat.ogg",
};

const disabledSfx = new Set<SfxName>();
const warnedAssetUrls = new Set<string>();
const sfxVoices = new Map<SfxName, HTMLAudioElement[]>();
const sfxVoiceIndex = new Map<SfxName, number>();

const ambientAudio = new Audio(assetUrl("audio/ambient/space_loop.ogg"));
ambientAudio.preload = "auto";
ambientAudio.loop = true;

let isAudioUnlocked = false;
let pendingAmbientStart = false;

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
  (Object.keys(sfxPaths) as SfxName[]).forEach((name) => {
    initSfxVoices(name);
  });
  updateAmbientVolume();
}

export function unlockAudio(): void {
  if (isAudioUnlocked) return;
  isAudioUnlocked = true;
  if (pendingAmbientStart || state.ambientEnabled) {
    tryStartAmbient();
    pendingAmbientStart = false;
  }
}

export function getAudioUnlocked(): boolean {
  return isAudioUnlocked;
}

export function playSfx(name: SfxName, opts?: SfxOptions): void {
  if (!isAudioUnlocked) return;
  if (state.masterMuted || !state.sfxEnabled || disabledSfx.has(name)) return;

  const voices = initSfxVoices(name);
  const nextIndex = sfxVoiceIndex.get(name) ?? 0;
  const voice = voices[nextIndex];
  sfxVoiceIndex.set(name, (nextIndex + 1) % voices.length);

  try {
    voice.pause();
    voice.currentTime = 0;
    voice.volume = effectiveVolume(state.sfxVolume * (opts?.volumeMul ?? 1));
    void voice.play().catch(() => {
      // swallow browser playback rejections
    });
  } catch {
    // never throw from UI audio calls
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
