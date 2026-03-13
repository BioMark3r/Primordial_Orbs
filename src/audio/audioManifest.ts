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

export type AudioManifest = {
  sfx: Record<SfxName, string | null>;
  ambient: string | null;
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
    ui_click: null,
    ui_hover: null,
    draw: null,
    orb_select: null,
    orb_play: null,
    impact_cast: null,
    hit: null,
    shield: null,
    combo: null,
    turn_end: null,
    invalid: null,
    victory: null,
    defeat: null,
  },
  ambient: null,
};
