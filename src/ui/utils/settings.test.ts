import { describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settings";

describe("audio settings persistence", () => {
  it("writes and reads audio preferences from localStorage", () => {
    const original = loadSettings();
    const next = {
      ...original,
      masterMuted: true,
      sfxEnabled: false,
      sfxVolume: 0.22,
      ambientEnabled: true,
      ambientVolume: 0.44,
    };

    saveSettings(next);
    const loaded = loadSettings();

    expect(loaded.masterMuted).toBe(true);
    expect(loaded.sfxEnabled).toBe(false);
    expect(loaded.sfxVolume).toBe(0.22);
    expect(loaded.ambientEnabled).toBe(true);
    expect(loaded.ambientVolume).toBe(0.44);
  });
});
