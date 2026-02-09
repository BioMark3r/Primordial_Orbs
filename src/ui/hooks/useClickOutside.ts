import { useEffect } from "react";
import type { RefObject } from "react";

export function useClickOutside(
  refs: Array<RefObject<HTMLElement | null>>,
  onOutside: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside) onOutside();
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [enabled, onOutside, refs]);
}
