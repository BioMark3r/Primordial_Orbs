import { assetUrl } from "../utils/assetUrl";

export type OrbElement = "lava" | "ice" | "nature" | "void";

export const ORB_SPRITE_PATHS: Record<OrbElement, string> = {
  lava: assetUrl("assets/orbs/orb_lava.webp"),
  ice: assetUrl("assets/orbs/orb_ice.webp"),
  nature: assetUrl("assets/orbs/orb_nature.webp"),
  void: assetUrl("assets/orbs/orb_void.webp"),
};

export function OrbIcon({ element, size = 64 }: { element: OrbElement; size?: number | string }) {
  const src = ORB_SPRITE_PATHS[element];
  return (
    <div className="orb-icon" style={{ width: size, height: size }}>
      <img src={src} alt={element} loading="lazy" />
    </div>
  );
}
