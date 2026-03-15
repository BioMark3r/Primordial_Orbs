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

export type AudioDebugSnapshot = {
  unlocked: boolean;
  unlockInFlight: boolean;
  pendingAmbientStart: boolean;
  masterMuted: boolean;
  sfxEnabled: boolean;
  ambientEnabled: boolean;
  sfxVolume: number;
  ambientVolume: number;
  ambientPath: string | null;
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
  sfxVolume: 0.9,
  ambientVolume: 0.15,
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

function logSettings(context: string): void {
  debugLog(
    `${context} settings masterMuted=${state.masterMuted} sfxEnabled=${state.sfxEnabled} ambientEnabled=${state.ambientEnabled} sfxVolume=${state.sfxVolume.toFixed(2)} ambientVolume=${state.ambientVolume.toFixed(2)}`,
  );
}

function initSfxVoices(name: SfxName): HTMLAudioElement[] | null {
  const existing = sfxVoices.get(name);
  if (existing) return existing;

  const path = audioManifest.sfx[name];
  if (!path) {
    disabledSfx.add(name);
    debugOnce(`load sfx ${name} skipped: unconfigured`, `sfx:${name}`);
    return null;
  }

  const src = assetUrl(path);
  const voices = Array.from({ length: VOICE_POOL_SIZE }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.addEventListener("canplaythrough", () => {
      debugOnce(`loaded sfx ${name} -> ${src}`, `loaded:${name}:${src}`);
    }, { once: true });
    audio.addEventListener("error", () => {
      disabledSfx.add(name);
      debugOnce(`load sfx ${name} failed -> ${src}`, `error:${name}:${src}`);
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
  if (!ambientAudio) {
    debugLog("playMusic(ambient) skipped: no ambient asset");
    return;
  }
  if (!isAudioUnlocked) {
    debugLog("playMusic(ambient) skipped: no user unlock yet");
    return;
  }
  if (!state.ambientEnabled) {
    debugLog("playMusic(ambient) skipped: ambient disabled");
    return;
  }
  if (state.masterMuted) {
    debugLog("playMusic(ambient) skipped: master muted");
    return;
  }

  updateAmbientVolume();
  debugLog(`playMusic(ambient) allowed=true volume=${ambientAudio.volume.toFixed(2)} src=${ambientAudio.src}`);
  void ambientAudio.play().catch((error) => {
    debugOnce(`playMusic(ambient) blocked: ${(error as Error)?.message ?? "unknown"}`, `ambient:play:${ambientAudio.src}`);
  });
}

if (ambientAudio) {
  ambientAudio.addEventListener("canplaythrough", () => {
    debugOnce(`loaded music ambient -> ${ambientAudio.src}`, `loaded:ambient:${ambientAudio.src}`);
  }, { once: true });
  ambientAudio.addEventListener("error", () => {
    state.ambientEnabled = false;
    pendingAmbientStart = false;
    debugOnce(`load music ambient failed -> ${ambientAudio.src}; ambient disabled`, `ambient:error:${ambientAudio.src}`);
  });
}

export function initAudio(): void {
  debugLog("init start", { baseUrl: import.meta.env.BASE_URL });
  (Object.keys(audioManifest.sfx) as SfxName[]).forEach((name) => {
    initSfxVoices(name);
  });
  if (!audioManifest.music.ambient) {
    debugOnce("ambient unconfigured; ambient playback disabled", "ambient:missing");
  }
  updateAmbientVolume();
  logSettings("init complete");
}

export function unlockAudio(): void {
  if (isAudioUnlocked || unlockInFlight) {
    debugLog(`resume requested skipped unlocked=${isAudioUnlocked} inFlight=${unlockInFlight}`);
    return;
  }

  debugLog("resume requested after user gesture");
  const probeVoices = initSfxVoices("click");
  const probe = probeVoices?.[0];

  if (!probe) {
    isAudioUnlocked = true;
    debugLog("unlock fallback complete (no probe available)");
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
      debugLog("unlock success");
      if (pendingAmbientStart || state.ambientEnabled) {
        tryStartAmbient();
        pendingAmbientStart = false;
      }
    })
    .catch((error) => {
      probe.volume = previousVolume;
      unlockInFlight = false;
      debugLog(`unlock blocked: ${(error as Error)?.message ?? "unknown"}`);
    });
}

export function getAudioUnlocked(): boolean {
  return isAudioUnlocked;
}

export function getAudioDebugSnapshot(): AudioDebugSnapshot {
  return {
    unlocked: isAudioUnlocked,
    unlockInFlight,
    pendingAmbientStart,
    masterMuted: state.masterMuted,
    sfxEnabled: state.sfxEnabled,
    ambientEnabled: state.ambientEnabled,
    sfxVolume: state.sfxVolume,
    ambientVolume: state.ambientVolume,
    ambientPath: ambientPath ? assetUrl(ambientPath) : null,
  };
}

export function playSfx(name: SfxName, opts?: SfxOptions): void {
  if (!isAudioUnlocked) {
    debugLog(`playSfx(${name}) skipped: no user unlock yet`);
    return;
  }
  if (state.masterMuted) {
    debugLog(`playSfx(${name}) skipped: master muted`);
    return;
  }
  if (!state.sfxEnabled) {
    debugLog(`playSfx(${name}) skipped: sfx muted`);
    return;
  }
  if (disabledSfx.has(name)) {
    debugLog(`playSfx(${name}) skipped: sfx disabled due to prior load/playback failure`);
    return;
  }

  const voices = initSfxVoices(name);
  if (!voices || voices.length === 0) {
    debugLog(`playSfx(${name}) skipped: no voice available`);
    return;
  }

  const nextIndex = sfxVoiceIndex.get(name) ?? 0;
  const voice = voices[nextIndex];
  sfxVoiceIndex.set(name, (nextIndex + 1) % voices.length);

  const variation = sfxVariation[name];
  const variedRate = randomInRange(variation.playbackRate);
  const variedVolume = randomInRange(variation.volume);
  const volume = effectiveVolume(state.sfxVolume * (opts?.volumeMul ?? 1) * variedVolume);

  try {
    voice.pause();
    voice.currentTime = 0;
    voice.playbackRate = variedRate;
    voice.volume = volume;
    debugLog(`playSfx(${name}) allowed=true volume=${volume.toFixed(2)} rate=${variedRate.toFixed(2)}`);
    void voice.play().catch((error) => {
      debugLog(`playSfx(${name}) blocked: ${(error as Error)?.message ?? "unknown"}`);
    });
  } catch {
    debugLog(`playSfx(${name}) failed`);
  }
}

export function playMusic(name: MusicName): void {
  if (name !== "ambient") return;
  state.ambientEnabled = true;
  if (!ambientAudio) {
    debugOnce("playMusic(ambient) skipped: no ambient asset is configured", "ambient:requested-without-asset");
    return;
  }
  updateAmbientVolume();
  if (!isAudioUnlocked) {
    requestAmbientStart();
    debugLog("playMusic(ambient) queued pending unlock");
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
  debugLog("stopMusic(ambient)");
}

export function startAmbient(): void {
  playMusic("ambient");
}

export function stopAmbient(): void {
  stopMusic("ambient");
}

export function setMasterMuted(muted: boolean): void {
  state.masterMuted = Boolean(muted);
  if (!ambientAudio) {
    logSettings("setMasterMuted");
    return;
  }
  if (state.masterMuted) {
    ambientAudio.pause();
  } else if (state.ambientEnabled && isAudioUnlocked) {
    tryStartAmbient();
  }
  updateAmbientVolume();
  logSettings("setMasterMuted");
}

export function setSfxEnabled(enabled: boolean): void {
  state.sfxEnabled = Boolean(enabled);
  logSettings("setSfxEnabled");
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
  logSettings("setSfxVolume");
}

export function setAmbientVolume(volume: number): void {
  state.ambientVolume = clamp01(volume);
  updateAmbientVolume();
  logSettings("setAmbientVolume");
}
