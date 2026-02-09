import type { Orb } from "../../engine/types";
import { ORB_COLORS, type OrbColorKey } from "../theme/orbColors";

export type OrbElement = "lava" | "ice" | "nature" | "void";

type OrbPalette = {
  glow: string;
  core: string;
  mid: string;
  rim: string;
  highlight: string;
  sparkle: string;
};

const TAU = Math.PI * 2;

type OrbRenderStyle = {
  element: OrbElement;
  colors: {
    base: string;
    hi: string;
    lo: string;
  };
};

type GradientSet = {
  glow: CanvasGradient;
  body: CanvasGradient;
  rim: CanvasGradient;
  shine: CanvasGradient;
};

const gradientCache = new WeakMap<CanvasRenderingContext2D, Map<string, GradientSet>>();

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function paletteFromColors(colors: OrbRenderStyle["colors"]): OrbPalette {
  return {
    glow: rgba(colors.base, 0.55),
    core: colors.hi,
    mid: colors.base,
    rim: colors.hi,
    highlight: rgba(colors.hi, 0.9),
    sparkle: rgba(colors.hi, 0.75),
  };
}

function getGradientSet(ctx: CanvasRenderingContext2D, r: number, styleKey: string, colors: OrbRenderStyle["colors"]): GradientSet {
  const key = `${styleKey}-${Math.round(r * 10)}`;
  let ctxCache = gradientCache.get(ctx);
  if (!ctxCache) {
    ctxCache = new Map();
    gradientCache.set(ctx, ctxCache);
  }
  const cached = ctxCache.get(key);
  if (cached) return cached;

  const palette = paletteFromColors(colors);
  const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.35);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  const body = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.2, 0, 0, r * 1.1);
  body.addColorStop(0, palette.core);
  body.addColorStop(0.55, palette.mid);
  body.addColorStop(0.8, colors.lo);
  body.addColorStop(1, "#0b0d18");

  const rim = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.05);
  rim.addColorStop(0, "rgba(255, 255, 255, 0)");
  rim.addColorStop(0.75, palette.rim);
  rim.addColorStop(1, "rgba(255, 255, 255, 0.12)");

  const shine = ctx.createRadialGradient(-r * 0.35, -r * 0.45, 0, -r * 0.25, -r * 0.35, r * 0.9);
  shine.addColorStop(0, palette.highlight);
  shine.addColorStop(0.4, "rgba(255, 255, 255, 0.25)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");

  const gradients = { glow, body, rim, shine };
  ctxCache.set(key, gradients);
  return gradients;
}

function drawLavaDetails(ctx: CanvasRenderingContext2D, r: number, t: number, palette: OrbPalette) {
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = palette.sparkle;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, t * 0.4, t * 0.4 + Math.PI * 1.2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = palette.sparkle;
  for (let i = 0; i < 5; i += 1) {
    const phase = t * 1.7 + i * 1.6;
    const dist = r * (0.25 + 0.12 * Math.sin(phase));
    const angle = phase * 0.7 + i;
    const size = r * (0.05 + 0.02 * Math.sin(phase * 1.3));
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, size, 0, TAU);
    ctx.fill();
  }
}

function drawIceDetails(ctx: CanvasRenderingContext2D, r: number, t: number, palette: OrbPalette) {
  ctx.strokeStyle = palette.sparkle;
  ctx.lineWidth = r * 0.06;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i += 1) {
    const offset = (i - 1) * r * 0.18 + Math.sin(t * 0.6 + i) * r * 0.04;
    ctx.beginPath();
    ctx.arc(0, offset, r * 0.65, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawNatureDetails(ctx: CanvasRenderingContext2D, r: number, t: number, palette: OrbPalette) {
  ctx.fillStyle = palette.sparkle;
  for (let i = 0; i < 6; i += 1) {
    const phase = t * 0.9 + i * 0.8;
    const dist = r * (0.2 + 0.18 * Math.sin(phase * 0.7));
    const angle = phase + i * 1.1;
    const size = r * (0.035 + 0.015 * Math.sin(phase));
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, size, 0, TAU);
    ctx.fill();
  }
}

function drawVoidDetails(ctx: CanvasRenderingContext2D, r: number, t: number, palette: OrbPalette) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = palette.sparkle;
  ctx.lineWidth = r * 0.08;
  ctx.setLineDash([r * 0.12, r * 0.18]);
  ctx.lineDashOffset = -t * r * 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, t * 0.2, t * 0.2 + Math.PI * 1.8);
  ctx.stroke();
  ctx.restore();
}

function drawElementDetails(ctx: CanvasRenderingContext2D, r: number, element: OrbElement, palette: OrbPalette, t: number) {
  switch (element) {
    case "lava":
      drawLavaDetails(ctx, r, t, palette);
      return;
    case "ice":
      drawIceDetails(ctx, r, t, palette);
      return;
    case "nature":
      drawNatureDetails(ctx, r, t, palette);
      return;
    case "void":
      drawVoidDetails(ctx, r, t, palette);
      return;
    default:
      return;
  }
}

export function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: OrbRenderStyle, t: number) {
  const palette = paletteFromColors(style.colors);
  const gradients = getGradientSet(ctx, r, style.element, style.colors);

  ctx.save();
  ctx.translate(x, y);

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradients.glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, TAU);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = gradients.body;
  ctx.fill();

  ctx.save();
  ctx.clip();
  drawElementDetails(ctx, r, style.element, palette, t);
  ctx.restore();

  ctx.strokeStyle = gradients.rim;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, TAU);
  ctx.stroke();

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradients.shine;
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.7, 0, TAU);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.99, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

function orbColorKeyForOrb(orb: Orb): OrbColorKey {
  if (orb.kind === "TERRAFORM") {
    return `TERRAFORM_${orb.t}` as OrbColorKey;
  }
  if (orb.kind === "COLONIZE") {
    const colonizeKey = orb.c === "HIGH_TECH" ? "HIGHTECH" : orb.c;
    return `COLONIZE_${colonizeKey}` as OrbColorKey;
  }
  if (orb.i === "TEMPORAL_VORTEX") {
    return "IMPACT_TEMPORALVORTEX";
  }
  return `IMPACT_${orb.i}` as OrbColorKey;
}

export function orbStyleForOrb(orb: Orb): OrbRenderStyle {
  const colorKey = orbColorKeyForOrb(orb);
  const colors = ORB_COLORS[colorKey];
  if (orb.kind === "TERRAFORM") {
    if (orb.t === "LAVA") return { element: "lava", colors };
    if (orb.t === "ICE") return { element: "ice", colors };
    if (orb.t === "GAS") return { element: "void", colors };
    return { element: "nature", colors };
  }
  if (orb.kind === "COLONIZE") {
    if (orb.c === "HIGH_TECH" || orb.c === "SENTIENT") return { element: "void", colors };
    return { element: "nature", colors };
  }
  if (orb.i === "BLACK_HOLE" || orb.i === "TEMPORAL_VORTEX") return { element: "void", colors };
  if (orb.i === "SOLAR_FLARE" || orb.i === "METEOR") return { element: "lava", colors };
  if (orb.i === "TORNADO") return { element: "ice", colors };
  return { element: "nature", colors };
}
