export type SfxName =
  | "click"
  | "draw"
  | "orbPlace"
  | "impactCast"
  | "impactLand"
  | "endPlay"
  | "error"
  | "unlock";

export type MusicName = "ambient" | "splashTheme";

export type AudioManifest = {
  sfx: Record<SfxName, string | null>;
  music: Record<MusicName, string | null>;
};

/**
 * Audio asset manifest.
 *
 * Leave entries as null to keep audio events disabled without triggering
 * failed network requests. To enable audio later, add files under `public/`
 * and set values to relative public paths (for example: `"sfx/click.mp3"`).
 */
export const audioManifest: AudioManifest = {
  sfx: {
    click: "sfx/click.mp3",
    orbPlace: "sfx/orb_place.mp3",
    impactCast: "sfx/impact_cast.mp3",
    impactLand: "sfx/impact_land.mp3",
    draw: "sfx/draw.mp3",
    endPlay: "sfx/end_play.mp3",
    error: "sfx/error.mp3",
    unlock: "sfx/unlock.mp3",
  },
  music: {
    ambient: "music/ambient_space.mp3",
    splashTheme: "music/splash_theme.mp3",
  },
};
