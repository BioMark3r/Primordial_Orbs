import { assetUrl } from "../ui/utils/assetUrl";
import { audioManifest, type MusicName, type SfxName } from "./audioManifest";

type SfxOptions = { volumeMul?: number };

type AudioState = {
  masterMuted: boolean;
  sfxEnabled: boolean;
  ambientEnabled: boolean;
  sfxVolume: number;
  ambientVolume: number;
};

type VariationRange = {
  playbackRate: readonly [number, number];
  volume: readonly [number, number];
};

const AUDIO_DEBUG = import.meta.env.DEV;
const VOICE_POOL_SIZE = 3;

const sfxVariation: Record<SfxName, VariationRange> = {
  click: { playbackRate: [0.98, 1.02], volume: [0.95, 1] },
  orbPlace: { playbackRate: [0.96, 1.04], volume: [0.92, 1] },
  impactCast: { playbackRate: [0.95, 1.05], volume: [0.94, 1] },
  impactLand: { playbackRate: [0.96, 1.03], volume: [0.95, 1] },
  draw: { playbackRate: [0.97, 1.03], volume: [0.94, 1] },
  unlock: { playbackRate: [0.97, 1.03], volume: [0.95, 1] },
  endPlay: { playbackRate: [0.99, 1.01], volume: [0.96, 1] },
  error: { playbackRate: [0.99, 1.01], volume: [0.96, 1] },
};

const disabledSfx = new Set<SfxName>();
const missingConfigLogged = new Set<string>();
const sfxVoices = new Map<SfxName, HTMLAudioElement[]>();
const sfxVoiceIndex = new Map<SfxName, number>();

const ambientPath = audioManifest.music.ambient;
const ambientAudio = ambientPath ? new Audio(assetUrl(ambientPath)) : null;
if (ambientAudio) {
  ambientAudio.preload = "auto";
  ambientAudio.loop = true;
}

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

function randomInRange([min, max]: readonly [number, number]): number {
  return min + Math.random() * (max - min);
}

function debugLog(message: string, ...details: unknown[]): void {
  if (!AUDIO_DEBUG) return;
  console.debug(`[audio] ${message}`, ...details);
}

function debugOnce(message: string, key: string): void {
  if (!AUDIO_DEBUG || missingConfigLogged.has(key)) return;
  missingConfigLogged.add(key);
  console.debug(`[audio] ${message}`);
}

function effectiveVolume(volume: number): number {
  if (state.masterMuted) return 0;
  return clamp01(volume);
}

function initSfxVoices(name: SfxName): HTMLAudioElement[] | null {
  const existing = sfxVoices.get(name);
  if (existing) return existing;

  const path = audioManifest.sfx[name];
  if (!path) {
    disabledSfx.add(name);
    debugOnce(`SFX "${name}" is unconfigured; skipping playback.`, `sfx:${name}`);
    return null;
  }

  const src = assetUrl(path);
  const voices = Array.from({ length: VOICE_POOL_SIZE }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      disabledSfx.add(name);
      debugOnce(`Failed to load SFX "${name}" from ${src}; disabling it.`, src);
    });
    return audio;
  });

  sfxVoices.set(name, voices);
  sfxVoiceIndex.set(name, 0);
  return voices;
}

function updateAmbientVolume(): void {
  if (!ambientAudio) return;
  ambientAudio.volume = effectiveVolume(state.ambientEnabled ? state.ambientVolume : 0);
}

function requestAmbientStart(): void {
  pendingAmbientStart = state.ambientEnabled;
}

function tryStartAmbient(): void {
  if (!ambientAudio) return;
  if (!isAudioUnlocked || !state.ambientEnabled || state.masterMuted) return;
  updateAmbientVolume();
  void ambientAudio.play().catch(() => {
    debugOnce(`Ambient playback blocked for ${ambientAudio.src}.`, ambientAudio.src);
  });
}

if (ambientAudio) {
  ambientAudio.addEventListener("error", () => {
    state.ambientEnabled = false;
    pendingAmbientStart = false;
    debugOnce(`Failed to load ambient track: ${ambientAudio.src}; ambient disabled.`, ambientAudio.src);
  });
}

export function initAudio(): void {
  debugLog("Initializing audio manager", { baseUrl: import.meta.env.BASE_URL });
  (Object.keys(audioManifest.sfx) as SfxName[]).forEach((name) => {
    initSfxVoices(name);
  });
  if (!audioManifest.music.ambient) {
    debugOnce("Ambient audio is unconfigured; ambient playback is disabled.", "ambient:missing");
  }
  updateAmbientVolume();
}

export function unlockAudio(): void {
  if (isAudioUnlocked || unlockInFlight) return;

  const probeVoices = initSfxVoices("click");
  const probe = probeVoices?.[0];

  if (!probe) {
    isAudioUnlocked = true;
    if (pendingAmbientStart || state.ambientEnabled) {
      tryStartAmbient();
      pendingAmbientStart = false;
    }
    return;
  }

  unlockInFlight = true;

  const previousVolume = probe.volume;
  probe.volume = 0;
  probe.currentTime = 0;

  void probe
    .play()
    .then(() => {
      probe.pause();
      probe.currentTime = 0;
      probe.volume = previousVolume;
      isAudioUnlocked = true;
      unlockInFlight = false;
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
  if (!isAudioUnlocked) return;
  if (state.masterMuted || !state.sfxEnabled || disabledSfx.has(name)) return;

  const voices = initSfxVoices(name);
  if (!voices || voices.length === 0) return;

  const nextIndex = sfxVoiceIndex.get(name) ?? 0;
  const voice = voices[nextIndex];
  sfxVoiceIndex.set(name, (nextIndex + 1) % voices.length);

  const variation = sfxVariation[name];
  const variedRate = randomInRange(variation.playbackRate);
  const variedVolume = randomInRange(variation.volume);

  try {
    voice.pause();
    voice.currentTime = 0;
    voice.playbackRate = variedRate;
    voice.volume = effectiveVolume(state.sfxVolume * (opts?.volumeMul ?? 1) * variedVolume);
    void voice.play().catch(() => {
      debugLog(`Playback blocked for SFX "${name}"`, { src: voice.src });
    });
  } catch {
    debugLog(`Playback failed for SFX "${name}"`);
  }
}

export function playMusic(name: MusicName): void {
  if (name !== "ambient") return;
  state.ambientEnabled = true;
  if (!ambientAudio) {
    debugOnce("Ambient requested but no ambient asset is configured.", "ambient:requested-without-asset");
    return;
  }
  updateAmbientVolume();
  if (!isAudioUnlocked) {
    requestAmbientStart();
    return;
  }
  tryStartAmbient();
}

export function stopMusic(name: MusicName): void {
  if (name !== "ambient") return;
  state.ambientEnabled = false;
  pendingAmbientStart = false;
  if (!ambientAudio) return;
  ambientAudio.pause();
  ambientAudio.currentTime = 0;
  updateAmbientVolume();
}

export function startAmbient(): void {
  playMusic("ambient");
}

export function stopAmbient(): void {
  stopMusic("ambient");
}

export function setMasterMuted(muted: boolean): void {
  state.masterMuted = Boolean(muted);
  if (!ambientAudio) return;
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
    playMusic("ambient");
    return;
  }
  stopMusic("ambient");
}

export function setSfxVolume(volume: number): void {
  state.sfxVolume = clamp01(volume);
}

export function setAmbientVolume(volume: number): void {
  state.ambientVolume = clamp01(volume);
  updateAmbientVolume();
}
