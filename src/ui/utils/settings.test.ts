import { describe, expect, it } from "vitest";
import { defaultSettings, loadSettings, saveSettings } from "./settings";

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

  it("uses healthy audio defaults", () => {
    const defaults = defaultSettings();
    expect(defaults.masterMuted).toBe(false);
    expect(defaults.sfxEnabled).toBe(true);
    expect(defaults.sfxVolume).toBe(0.9);
    expect(defaults.ambientEnabled).toBe(false);
    expect(defaults.ambientVolume).toBe(0.15);
  });

  it("defensively parses legacy/corrupt values", () => {
    localStorage.setItem(
      "po_settings_v1",
      JSON.stringify({
        masterMuted: "false",
        sfxEnabled: "1",
        sfxVolume: "0.8",
        ambientEnabled: "true",
        ambientVolume: "0.18",
      })
    );

    const loaded = loadSettings();
    expect(loaded.masterMuted).toBe(false);
    expect(loaded.sfxEnabled).toBe(true);
    expect(loaded.sfxVolume).toBe(0.8);
    expect(loaded.ambientEnabled).toBe(true);
    expect(loaded.ambientVolume).toBe(0.18);
  });
});
