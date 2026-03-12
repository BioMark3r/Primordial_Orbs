#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Default margin around tight artwork bounds to keep icons from touching edges.
const DEFAULT_PADDING = 0.06;
const SUPPORTED_TAGS = new Set(['path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect']);
const COMMAND_RE = /([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;

function parseArgs(argv) {
  const args = {
    mode: 'check',
    padding: DEFAULT_PADDING,
    roots: ['src/assets/orbs', 'src/assets/cores'],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--write') args.mode = 'write';
    else if (arg === '--check') args.mode = 'check';
    else if (arg.startsWith('--padding=')) {
      const value = Number(arg.slice('--padding='.length));
      if (!Number.isFinite(value) || value < 0 || value > 0.5) throw new Error(`Invalid --padding value: ${arg}`);
      args.padding = value;
    } else if (arg === '--dir') {
      const dir = argv[i + 1];
      if (!dir) throw new Error('Missing directory after --dir');
      args.roots.push(dir);
      i += 1;
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }

  args.roots = Array.from(new Set(args.roots));
  return args;
}

function parseAttributes(raw) {
  const attrs = {};
  const attrRe = /([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g;
  let match;
  while ((match = attrRe.exec(raw)) !== null) {
    attrs[match[1]] = match[2].slice(1, -1);
  }
  return attrs;
}

function parseNumber(value, fallback = NaN) {
  if (value == null || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function numbersFromList(value) {
  if (!value) return [];
  const matches = value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  return (matches ?? []).map(Number);
}

function tokenizePath(d) {
  const tokens = [];
  let m;
  while ((m = COMMAND_RE.exec(d)) !== null) {
    if (m[1]) tokens.push({ type: 'cmd', value: m[1] });
    else tokens.push({ type: 'num', value: Number(m[2]) });
  }
  return tokens;
}

function includePoint(bounds, x, y) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function sampleCubic(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x;
  const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y;
  return { x, y };
}

function sampleQuadratic(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt ** 2 * p0.x + 2 * mt * t * p1.x + t ** 2 * p2.x,
    y: mt ** 2 * p0.y + 2 * mt * t * p1.y + t ** 2 * p2.y,
  };
}

function vectorAngle(ux, uy, vx, vy) {
  const dot = ux * vx + uy * vy;
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  const ratio = Math.min(1, Math.max(-1, dot / (len || 1)));
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  return sign * Math.acos(ratio);
}

function arcToCenter(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
  const rad = (phi * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cos * dx2 + sin * dy2;
  const y1p = -sin * dx2 + cos * dy2;

  let rxsq = rx * rx;
  let rysq = ry * ry;
  const x1psq = x1p * x1p;
  const y1psq = y1p * y1p;

  const lambda = x1psq / rxsq + y1psq / rysq;
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
    rxsq = rx * rx;
    rysq = ry * ry;
  }

  const sign = largeArc === sweep ? -1 : 1;
  const num = Math.max(0, rxsq * rysq - rxsq * y1psq - rysq * x1psq);
  const den = rxsq * y1psq + rysq * x1psq;
  const factor = sign * Math.sqrt(num / (den || 1));
  const cxp = factor * ((rx * y1p) / ry);
  const cyp = factor * (-(ry * x1p) / rx);

  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  let theta1 = vectorAngle(1, 0, ux, uy);
  let delta = vectorAngle(ux, uy, vx, vy);

  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;

  return { cx, cy, rx, ry, rad, theta1, delta };
}

// Approximate path geometry bounds by walking commands and sampling curves/arcs.
// This covers common icon paths while staying dependency-free and deterministic.
function pathBounds(d) {
  const tokens = tokenizePath(d);
  if (tokens.length === 0) return null;

  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let i = 0;
  let cmd = null;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastCubicControl = null;
  let lastQuadControl = null;

  const read = () => {
    if (i >= tokens.length || tokens[i].type !== 'num') throw new Error('Invalid path data');
    return tokens[i++].value;
  };

  while (i < tokens.length) {
    if (tokens[i].type === 'cmd') cmd = tokens[i++].value;
    if (!cmd) throw new Error('Path data missing command');
    const rel = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();

    if (upper === 'M') {
      x = (rel ? x : 0) + read();
      y = (rel ? y : 0) + read();
      startX = x; startY = y;
      includePoint(bounds, x, y);
      while (i < tokens.length && tokens[i].type === 'num') {
        x = (rel ? x : 0) + read();
        y = (rel ? y : 0) + read();
        includePoint(bounds, x, y);
      }
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (upper === 'L') {
      while (i < tokens.length && tokens[i].type === 'num') {
        x = (rel ? x : 0) + read();
        y = (rel ? y : 0) + read();
        includePoint(bounds, x, y);
      }
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (upper === 'H') {
      while (i < tokens.length && tokens[i].type === 'num') {
        x = (rel ? x : 0) + read();
        includePoint(bounds, x, y);
      }
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (upper === 'V') {
      while (i < tokens.length && tokens[i].type === 'num') {
        y = (rel ? y : 0) + read();
        includePoint(bounds, x, y);
      }
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (upper === 'C') {
      while (i < tokens.length && tokens[i].type === 'num') {
        const p0 = { x, y };
        const p1 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        const p2 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        const p3 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        for (let t = 0; t <= 1; t += 1 / 24) includePoint(bounds, sampleCubic(p0, p1, p2, p3, t).x, sampleCubic(p0, p1, p2, p3, t).y);
        x = p3.x; y = p3.y; lastCubicControl = p2; lastQuadControl = null;
      }
    } else if (upper === 'S') {
      while (i < tokens.length && tokens[i].type === 'num') {
        const p0 = { x, y };
        const p1 = lastCubicControl ? { x: 2 * x - lastCubicControl.x, y: 2 * y - lastCubicControl.y } : { x, y };
        const p2 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        const p3 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        for (let t = 0; t <= 1; t += 1 / 24) includePoint(bounds, sampleCubic(p0, p1, p2, p3, t).x, sampleCubic(p0, p1, p2, p3, t).y);
        x = p3.x; y = p3.y; lastCubicControl = p2; lastQuadControl = null;
      }
    } else if (upper === 'Q') {
      while (i < tokens.length && tokens[i].type === 'num') {
        const p0 = { x, y };
        const p1 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        const p2 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        for (let t = 0; t <= 1; t += 1 / 24) includePoint(bounds, sampleQuadratic(p0, p1, p2, t).x, sampleQuadratic(p0, p1, p2, t).y);
        x = p2.x; y = p2.y; lastQuadControl = p1; lastCubicControl = null;
      }
    } else if (upper === 'T') {
      while (i < tokens.length && tokens[i].type === 'num') {
        const p0 = { x, y };
        const p1 = lastQuadControl ? { x: 2 * x - lastQuadControl.x, y: 2 * y - lastQuadControl.y } : { x, y };
        const p2 = { x: (rel ? x : 0) + read(), y: (rel ? y : 0) + read() };
        for (let t = 0; t <= 1; t += 1 / 24) includePoint(bounds, sampleQuadratic(p0, p1, p2, t).x, sampleQuadratic(p0, p1, p2, t).y);
        x = p2.x; y = p2.y; lastQuadControl = p1; lastCubicControl = null;
      }
    } else if (upper === 'A') {
      while (i < tokens.length && tokens[i].type === 'num') {
        let rx = Math.abs(read());
        let ry = Math.abs(read());
        const phi = read();
        const largeArc = read() ? 1 : 0;
        const sweep = read() ? 1 : 0;
        const x2 = (rel ? x : 0) + read();
        const y2 = (rel ? y : 0) + read();

        if (rx === 0 || ry === 0) {
          includePoint(bounds, x2, y2);
        } else {
          const arc = arcToCenter(x, y, rx, ry, phi, largeArc, sweep, x2, y2);
          const steps = 32;
          for (let s = 0; s <= steps; s += 1) {
            const theta = arc.theta1 + (arc.delta * s) / steps;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            const px = arc.cx + arc.rx * Math.cos(arc.rad) * ct - arc.ry * Math.sin(arc.rad) * st;
            const py = arc.cy + arc.rx * Math.sin(arc.rad) * ct + arc.ry * Math.cos(arc.rad) * st;
            includePoint(bounds, px, py);
          }
        }

        x = x2; y = y2; lastCubicControl = null; lastQuadControl = null;
      }
    } else if (upper === 'Z') {
      x = startX;
      y = startY;
      includePoint(bounds, x, y);
      lastCubicControl = null;
      lastQuadControl = null;
    } else {
      throw new Error(`Unsupported path command: ${cmd}`);
    }
  }

  if (!Number.isFinite(bounds.minX)) return null;
  return bounds;
}

function expandByStroke(bounds, strokeWidth) {
  const half = strokeWidth > 0 ? strokeWidth / 2 : 0;
  return { minX: bounds.minX - half, minY: bounds.minY - half, maxX: bounds.maxX + half, maxY: bounds.maxY + half };
}

function boundsForTag(tag, attrs) {
  switch (tag) {
    case 'circle': {
      const cx = parseNumber(attrs.cx), cy = parseNumber(attrs.cy), r = parseNumber(attrs.r);
      if (![cx, cy, r].every(Number.isFinite) || r < 0) return null;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
    }
    case 'ellipse': {
      const cx = parseNumber(attrs.cx), cy = parseNumber(attrs.cy), rx = parseNumber(attrs.rx), ry = parseNumber(attrs.ry);
      if (![cx, cy, rx, ry].every(Number.isFinite) || rx < 0 || ry < 0) return null;
      return { minX: cx - rx, minY: cy - ry, maxX: cx + rx, maxY: cy + ry };
    }
    case 'line': {
      const x1 = parseNumber(attrs.x1), y1 = parseNumber(attrs.y1), x2 = parseNumber(attrs.x2), y2 = parseNumber(attrs.y2);
      if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
      return { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) };
    }
    case 'rect': {
      const x = parseNumber(attrs.x, 0), y = parseNumber(attrs.y, 0), width = parseNumber(attrs.width), height = parseNumber(attrs.height);
      if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) return null;
      return { minX: x, minY: y, maxX: x + width, maxY: y + height };
    }
    case 'polyline':
    case 'polygon': {
      const nums = numbersFromList(attrs.points);
      if (nums.length < 2 || nums.length % 2 !== 0) return null;
      const xs = nums.filter((_, idx) => idx % 2 === 0);
      const ys = nums.filter((_, idx) => idx % 2 === 1);
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    }
    case 'path': {
      if (!attrs.d?.trim()) return null;
      return pathBounds(attrs.d);
    }
    default:
      return null;
  }
}

function mergeBounds(current, next) {
  if (!current) return { ...next };
  return {
    minX: Math.min(current.minX, next.minX),
    minY: Math.min(current.minY, next.minY),
    maxX: Math.max(current.maxX, next.maxX),
    maxY: Math.max(current.maxY, next.maxY),
  };
}

const formatNumber = (value) => Number(value.toFixed(3)).toString();
const formatViewBox = (b) => [b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY].map(formatNumber).join(' ');

function computeViewBox(svgText, paddingPercent) {
  const svgOpen = svgText.match(/<svg\b([^>]*)>/i);
  if (!svgOpen) return { error: 'Missing <svg> root.' };

  const rootAttrs = parseAttributes(svgOpen[1]);
  const rootStroke = rootAttrs.stroke ?? 'none';
  const rootStrokeWidth = parseNumber(rootAttrs['stroke-width'], 1);

  // Fail safe: transformed geometry needs full matrix math; skip instead of corrupting assets.
  if (svgText.match(/<(g|path|circle|ellipse|line|polyline|polygon|rect)\b[^>]*\btransform\s*=/gi)) {
    return { error: 'Contains transform attributes (not auto-normalized safely).' };
  }

  let merged = null;
  const tagRe = /<(path|circle|ellipse|line|polyline|polygon|rect)\b([^>]*)\/?>(?:\s*<\/\1>)?/gi;
  let foundAny = false;
  let m;
  while ((m = tagRe.exec(svgText)) !== null) {
    const tag = m[1].toLowerCase();
    if (!SUPPORTED_TAGS.has(tag)) continue;
    foundAny = true;

    const attrs = parseAttributes(m[2]);
    const rawBounds = boundsForTag(tag, attrs);
    if (!rawBounds) return { error: `Could not parse geometry for <${tag}>.` };

    const stroke = attrs.stroke ?? rootStroke;
    const strokeWidth = stroke === 'none' ? 0 : parseNumber(attrs['stroke-width'], rootStrokeWidth);
    const stroked = expandByStroke(rawBounds, Number.isFinite(strokeWidth) ? Math.max(strokeWidth, 0) : 0);
    merged = mergeBounds(merged, stroked);
  }

  if (!foundAny || !merged) return { error: 'No supported geometry elements found.' };

  const width = Math.max(merged.maxX - merged.minX, 0.001);
  const height = Math.max(merged.maxY - merged.minY, 0.001);
  const pad = Math.max(width, height) * paddingPercent;

  return {
    viewBox: formatViewBox({ minX: merged.minX - pad, minY: merged.minY - pad, maxX: merged.maxX + pad, maxY: merged.maxY + pad }),
  };
}

function normalizeSvg(svgText, paddingPercent) {
  const result = computeViewBox(svgText, paddingPercent);
  if (result.error) return result;

  const rewritten = svgText.replace(/<svg\b([^>]*)>/i, (full, attrsText) => {
    let attrs = attrsText;
    attrs = attrs.replace(/\s+viewBox\s*=\s*("[^"]*"|'[^']*')/i, '');
    attrs = attrs.replace(/\s+width\s*=\s*("[^"]*"|'[^']*')/i, '');
    attrs = attrs.replace(/\s+height\s*=\s*("[^"]*"|'[^']*')/i, '');
    return `<svg${attrs} viewBox="${result.viewBox}">`;
  });

  return { viewBox: result.viewBox, text: `${rewritten.trim()}\n` };
}

async function* walkSvgFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walkSvgFiles(full);
    else if (entry.isFile() && full.endsWith('.svg')) yield full;
  }
}

async function run() {
  const args = parseArgs(process.argv);
  const changed = [];
  const warnings = [];

  for (const root of args.roots) {
    let stat;
    try { stat = await fs.stat(root); } catch { warnings.push(`Skipping missing directory: ${root}`); continue; }
    if (!stat.isDirectory()) { warnings.push(`Skipping non-directory path: ${root}`); continue; }

    for await (const file of walkSvgFiles(root)) {
      const raw = await fs.readFile(file, 'utf8');
      const normalized = normalizeSvg(raw, args.padding);
      if (normalized.error) { warnings.push(`${file}: ${normalized.error}`); continue; }
      if (normalized.text !== raw) {
        changed.push(file);
        if (args.mode === 'write') await fs.writeFile(file, normalized.text, 'utf8');
      }
    }
  }

  if (args.mode === 'check') {
    if (changed.length > 0) {
      console.log('SVGs requiring normalization:');
      changed.forEach((f) => console.log(` - ${f}`));
      console.log(`\n${changed.length} file(s) would be updated.`);
      if (warnings.length > 0) {
        console.warn('\nWarnings:');
        warnings.forEach((w) => console.warn(` - ${w}`));
      }
      process.exitCode = 1;
      return;
    }
    console.log('All scanned SVGs are normalized.');
  } else {
    if (changed.length === 0) console.log('No SVG files changed.');
    else {
      console.log(`Updated ${changed.length} SVG file(s):`);
      changed.forEach((f) => console.log(` - ${f}`));
    }
  }

  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    warnings.forEach((w) => console.warn(` - ${w}`));
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
