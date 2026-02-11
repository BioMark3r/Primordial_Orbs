import packageJson from "../../../package.json";
import type { GameState } from "../../engine/types";
import type { ReplayBundleV1 } from "./actionLog";
import { digestState } from "./stateDigest";

export type FeedbackAnswers = {
  fun: "yes" | "no" | "unsure";
  clarity: "clear" | "mixed" | "confusing";
  difficulty: "easy" | "ok" | "hard";
  comments: string;
  selected?: string[];
};

export type ReportBundle = {
  version: string;
  buildTime?: string;
  userAgent: string;
  url: string;
  settings?: unknown;
  game: {
    phase: string;
    turn: number;
    activePlayer: number;
    seed?: string;
  };
  matchCode?: string;
  replayBundle?: string;
  digests?: { current?: string; replayed?: string };
  notes?: {
    feedback?: FeedbackAnswers;
  };
};

type BuildReportBundleOptions = {
  state: GameState;
  settings?: unknown;
  feedback?: FeedbackAnswers;
  matchCode?: string;
  replayBundle?: ReplayBundleV1 | string | null;
  replayedState?: GameState | null;
  version?: string;
  buildTime?: string;
};

function getVersion(versionOverride?: string): string {
  if (versionOverride) return versionOverride;
  if (typeof import.meta.env.VITE_APP_VERSION === "string" && import.meta.env.VITE_APP_VERSION.trim()) {
    return import.meta.env.VITE_APP_VERSION;
  }
  return packageJson.version;
}

function normalizeReplayBundle(replayBundle: BuildReportBundleOptions["replayBundle"]): string | undefined {
  if (!replayBundle) return undefined;
  if (typeof replayBundle === "string") return replayBundle;
  return JSON.stringify(replayBundle, null, 2);
}

export function buildReportBundle(opts: BuildReportBundleOptions): ReportBundle {
  const replayText = normalizeReplayBundle(opts.replayBundle);
  const currentDigest = digestState(opts.state).hash;
  const replayedDigest = opts.replayedState ? digestState(opts.replayedState).hash : undefined;
  return {
    version: getVersion(opts.version),
    ...(opts.buildTime ? { buildTime: opts.buildTime } : {}),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...(opts.settings ? { settings: opts.settings } : {}),
    game: {
      phase: opts.state.phase,
      turn: opts.state.turn,
      activePlayer: opts.state.active,
      seed: String(opts.state.seed),
    },
    ...(opts.matchCode ? { matchCode: opts.matchCode } : {}),
    ...(replayText ? { replayBundle: replayText } : {}),
    digests: {
      current: currentDigest,
      ...(replayedDigest ? { replayed: replayedDigest } : {}),
    },
    ...(opts.feedback ? { notes: { feedback: opts.feedback } } : {}),
  };
}

export function reportBundleToText(bundle: ReportBundle): string {
  const lines = [
    "--- Primordial Orbs Report Bundle ---",
    `Version: ${bundle.version}`,
    ...(bundle.buildTime ? [`Build Time: ${bundle.buildTime}`] : []),
    `URL: ${bundle.url}`,
    `Phase: ${bundle.game.phase}`,
    `Turn: ${String(bundle.game.turn)}`,
    `Active Player: ${String(bundle.game.activePlayer + 1)}`,
    ...(bundle.game.seed ? [`Seed: ${bundle.game.seed}`] : []),
    "",
    "[MatchCode]",
    bundle.matchCode ?? "(not available)",
    "",
    "[ReplayBundle]",
    bundle.replayBundle ?? "(not available)",
    "",
    "[JSON]",
    JSON.stringify(bundle, null, 2),
  ];
  return `${lines.join("\n")}\n`;
}

export async function copyReportBundleToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "true");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);
      return copied;
    } catch {
      return false;
    }
  }
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
