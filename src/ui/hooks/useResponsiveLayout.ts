import { useEffect, useState } from "react";

export type ViewportMode = "mobile" | "tablet" | "desktop";

type ResponsiveLayout = {
  viewportMode: ViewportMode;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  canHover: boolean;
  isCoarsePointer: boolean;
};

const MOBILE_MAX = 640;
const TABLET_MAX = 1024;

function getViewportMode(width: number): ViewportMode {
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

function readLayout(): ResponsiveLayout {
  if (typeof window === "undefined") {
    return {
      viewportMode: "desktop",
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      canHover: true,
      isCoarsePointer: false,
    };
  }

  const viewportMode = getViewportMode(window.innerWidth);
  const canHover = typeof window.matchMedia === "function"
    ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
    : true;
  const isCoarsePointer = typeof window.matchMedia === "function"
    ? window.matchMedia("(hover: none) and (pointer: coarse)").matches
    : false;

  return {
    viewportMode,
    isMobile: viewportMode === "mobile",
    isTablet: viewportMode === "tablet",
    isDesktop: viewportMode === "desktop",
    canHover,
    isCoarsePointer,
  };
}

export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>(() => readLayout());

  useEffect(() => {
    const updateLayout = () => setLayout(readLayout());

    updateLayout();
    window.addEventListener("resize", updateLayout);

    const mediaQueries = [
      window.matchMedia("(hover: hover) and (pointer: fine)"),
      window.matchMedia("(hover: none) and (pointer: coarse)"),
    ];

    mediaQueries.forEach((query) => query.addEventListener("change", updateLayout));

    return () => {
      window.removeEventListener("resize", updateLayout);
      mediaQueries.forEach((query) => query.removeEventListener("change", updateLayout));
    };
  }, []);

  return layout;
}
