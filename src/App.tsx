import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "./assets/logo.png";
import type { Action, Core, GameState, Impact, Mode, Orb } from "./engine/types";
import { reducer } from "./engine/reducer";
import { newGame } from "./engine/setup";
import { CoreBadge } from "./ui/components/CoreBadge";
import { OrbToken } from "./ui/components/OrbToken";
import { ArenaView } from "./ui/components/ArenaView";
import { ImpactPreviewPanel } from "./ui/components/ImpactPreviewPanel";
import { ToastStack } from "./ui/components/ToastStack";
import { ProgressTrack } from "./ui/components/ProgressTrack";
import { PlanetIcon } from "./ui/components/PlanetIcon";
import { WinCelebration } from "./ui/components/WinCelebration";
import { CoachStrip } from "./ui/components/CoachStrip";
import { TutorialOverlay } from "./ui/components/TutorialOverlay";
import { TurnRecapToast } from "./ui/components/TurnRecapToast";
import { Tooltip } from "./ui/components/Tooltip";
import { MenuButton } from "./ui/components/MenuButton";
import { MenuItem } from "./ui/components/MenuItem";
import { beginPendingImpactDiff, resolvePendingDiff } from "./ui/utils/pendingDiff";
import type { PendingDiff } from "./ui/utils/pendingDiff";
import { computeImpactPreview } from "./ui/utils/impactPreview";
import type { ImpactPreview } from "./ui/utils/impactPreview";
import { deriveCoreFeedback } from "./ui/utils/coreFeedback";
import type { ImpactResolvedSummary } from "./ui/utils/coreFeedback";
import { fxForImpact } from "./ui/utils/impactFx";
import { pushToast, pushUniqueToast } from "./ui/utils/toasts";
import { computeProgressFromPlanet, diffProgress } from "./ui/utils/progress";
import type { ColonizeType, ProgressState } from "./ui/utils/progress";
import { computePlanetViz } from "./ui/utils/planetViz";
import type { PlanetViz } from "./ui/utils/planetViz";
import type { CoachHint } from "./ui/utils/coach";
import { getCoachHints } from "./ui/utils/coach";
import { handleKeyDown } from "./ui/utils/shortcuts";
import type { ShortcutContext } from "./ui/utils/shortcuts";
import { pushHistory, undo } from "./ui/utils/history";
import type { HistoryState } from "./ui/utils/history";
import type { ActionEvent, GuideMode } from "./ui/utils/tutorialGuide";
import { nextIndexOnEvent } from "./ui/utils/tutorialGuide";
import { TUTORIAL_STEPS } from "./ui/utils/tutorialSteps";
import { hasSeenTutorial, markSeenTutorial } from "./ui/utils/tutorialStorage";
import { buildTurnRecap } from "./ui/utils/turnRecap";
import type { TurnRecap } from "./ui/utils/turnRecap";
import { getButtonDisabledReason, getOrbDisabledReason } from "./ui/utils/disabledReasons";
import { DEFAULT_HAND_SIZE_LIMIT, validateIntent, type ActionIntent } from "./ui/utils/actionValidation";
import {
  exportMatchCode,
  importMatchCode,
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./ui/utils/save";
import type { SavePayloadV1 } from "./ui/utils/save";
import {
  actionPayload,
  getDrawResult,
  shouldRecordReplay,
  validateReplayBundle,
} from "./ui/utils/actionLog";
import type { ReplayBundleV1, ReplayEntryV1 } from "./ui/utils/actionLog";
import { replayFromStart, validateReplayMatchesCurrent } from "./ui/utils/replay";
import { DeterminismPanel } from "./ui/components/DeterminismPanel";
import { TurnHandoffOverlay } from "./ui/components/TurnHandoffOverlay";
import { createAiRunner } from "./ai/aiRunner";
import type { AiConfig } from "./ai/aiTypes";

type Screen = "SPLASH" | "SETUP" | "GAME";
type Selected = { kind: "NONE" } | { kind: "HAND"; handIndex: number; orb: Orb };
type ImpactTargetChoice = "OPPONENT" | "SELF";
export type UIEvent =
  | { kind: "IMPACT_CAST"; at: number; impact: Impact; source: 0 | 1; target: 0 | 1 }
  | { kind: "IMPACT_RESOLVED"; at: number; impact: Impact; source: 0 | 1; target: 0 | 1; affectedSlots: number[] }
  | { kind: "DRAW"; at: number; player: 0 | 1 }
  | { kind: "PLACE"; at: number; player: 0 | 1; slotIndex: number };

const CORES: Core[] = ["LAND", "WATER", "ICE", "LAVA", "GAS"];
const HISTORY_LIMIT = 30;
const RULEBOOK_URL = "/rulebook.html";

function openRulebook() {
  window.open(RULEBOOK_URL, "_blank", "noopener,noreferrer");
}

function orbLabel(o: Orb): string {
  if (o.kind === "TERRAFORM") return `Terraform: ${o.t}`;
  if (o.kind === "COLONIZE") return `Colonize: ${o.c}`;
  return `Impact: ${o.i}`;
}
function orbShort(o: Orb): string {
  if (o.kind === "TERRAFORM") return o.t;
  if (o.kind === "COLONIZE") return o.c;
  return o.i;
}
function terraformCount(planet: (Orb | null)[]): number {
  return planet.filter((s) => s?.kind === "TERRAFORM").length;
}
function colonizeTypesCount(planet: (Orb | null)[]): number {
  const set = new Set<string>();
  for (const s of planet) if (s?.kind === "COLONIZE") set.add(s.c);
  return set.size;
}
function isHandOverflow(state: GameState): boolean {
  const p = state.active;
  return state.players[p].hand.length > 3;
}
function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}
function toActionIntent(action: Action): ActionIntent | null {
  switch (action.type) {
    case "DRAW_2":
      return { type: "DRAW_2" };
    case "DISCARD_FROM_HAND":
      return { type: "DISCARD_FROM_HAND", handIndex: action.index };
    case "PLAY_TERRAFORM":
      return { type: "PLAY_TERRAFORM", handIndex: action.handIndex, slotIndex: action.slotIndex };
    case "PLAY_COLONIZE":
      return { type: "PLAY_COLONIZE", handIndex: action.handIndex, slotIndex: action.slotIndex };
    case "PLAY_IMPACT":
      return { type: "PLAY_IMPACT", handIndex: action.handIndex, target: action.target };
    case "WATER_SWAP":
      return { type: "WATER_SWAP", a: action.slotA, b: action.slotB };
    case "GAS_REDRAW":
      return { type: "GAS_REDRAW", handIndex: action.handIndex };
    case "END_PLAY":
      return { type: "END_PLAY" };
    case "ADVANCE":
      return { type: "ADVANCE" };
    default:
      return null;
  }
}

function intentToAction(intent: ActionIntent): Action | null {
  switch (intent.type) {
    case "DRAW_2":
      return { type: "DRAW_2" };
    case "DISCARD_FROM_HAND":
      return { type: "DISCARD_FROM_HAND", index: intent.handIndex };
    case "PLAY_TERRAFORM":
      return { type: "PLAY_TERRAFORM", handIndex: intent.handIndex, slotIndex: intent.slotIndex };
    case "PLAY_COLONIZE":
      return { type: "PLAY_COLONIZE", handIndex: intent.handIndex, slotIndex: intent.slotIndex };
    case "PLAY_IMPACT":
      return { type: "PLAY_IMPACT", handIndex: intent.handIndex, target: intent.target };
    case "WATER_SWAP":
      return { type: "WATER_SWAP", slotA: intent.a, slotB: intent.b };
    case "GAS_REDRAW":
      return { type: "GAS_REDRAW", handIndex: intent.handIndex };
    case "END_PLAY":
      return { type: "END_PLAY" };
    case "ADVANCE":
      return { type: "ADVANCE" };
    default:
      return null;
  }
}

function usedAbilityKeys(player: GameState["players"][number]) {
  const keys: string[] = [];
  if (player.abilities.land_free_terraform_used_turn) keys.push("LAND_FREE_TERRAFORM_USED");
  if (player.abilities.water_swap_used_turn) keys.push("WATER_SWAP_USED");
  if (player.abilities.ice_shield_used_turn) keys.push("ICE_SHIELD_USED");
  if (player.abilities.gas_redraw_used_turn) keys.push("GAS_REDRAW_USED");
  if (player.abilities.plant_block_used_round) keys.push("PLANT_MITIGATION_USED");
  if (player.abilities.hightech_redirect_used) keys.push("HIGHTECH_REDIRECT_USED");
  return keys;
}

function shouldRecordHistory(action: Action): boolean {
  switch (action.type) {
    case "DRAW_2":
    case "DISCARD_FROM_HAND":
    case "PLAY_TERRAFORM":
    case "PLAY_COLONIZE":
    case "PLAY_IMPACT":
    case "WATER_SWAP":
    case "GAS_REDRAW":
    case "END_PLAY":
    case "ADVANCE":
      return true;
    case "NEW_GAME":
      return false;
    default:
      return false;
  }
}

function getTerraformInfo(t: Core) {
  switch (t) {
    case "LAND":
      return "Land: stable terraform. Core passive grants a free Terraform each turn.";
    case "WATER":
      return "Water: adaptive terraform. Core passive swaps two Terraform orbs each turn.";
    case "ICE":
      return "Ice: defensive terraform. Core passive shields the first impact against you.";
    case "LAVA":
      return "Lava: volatile terraform. Core passive boosts your impacts by +1 severity.";
    case "GAS":
      return "Gas: flexible terraform. Core passive lets you Shift-click a hand orb to redraw.";
    default:
      return "Terraform: build your planet.";
  }
}

function getColonizeInfoText(c: "PLANT" | "ANIMAL" | "SENTIENT" | "HIGH_TECH") {
  switch (c) {
    case "PLANT":
      return "Plant: enables Plant mitigation when abilities are ready.";
    case "ANIMAL":
      return "Animal: standard colonization type toward victory.";
    case "SENTIENT":
      return "Sentient: unlocks higher-tier colonization.";
    case "HIGH_TECH":
      return "High-Tech: enables redirect once per game.";
    default:
      return "Colonize: contributes toward victory.";
  }
}

const COLONIZE_LABELS: Record<ColonizeType, string> = {
  PLANT: "Plant",
  ANIMAL: "Animal",
  SENTIENT: "Sentient",
  HIGH_TECH: "High-Tech",
};

function getImpactInfo(impact: Impact) {
  switch (impact) {
    case "METEOR":
      return "Meteor: remove Terraform (severity determines count).";
    case "TORNADO":
      return "Tornado: strip Terraform from a planet.";
    case "QUAKE":
      return "Quake: destabilize, removing Terraform.";
    case "SOLAR_FLARE":
      return "Solar Flare: disables abilities for the target's next turn.";
    case "DISEASE":
      return "Disease: removes Colonize (Water planets are more vulnerable).";
    case "TEMPORAL_VORTEX":
      return "Temporal Vortex: rewinds the planet to an earlier state.";
    case "BLACK_HOLE":
      return "Black Hole: removes Colonize if present, otherwise Terraform.";
    default:
      return "Impact: disruptive effect.";
  }
}

function orbTooltip(o: Orb): string {
  if (o.kind === "TERRAFORM") {
    return `${orbLabel(o)} — Terraform orbs build your planet. ${getTerraformInfo(o.t)}`;
  }
  if (o.kind === "COLONIZE") {
    return `${orbLabel(o)} — Colonize on Terraform slots. ${getColonizeInfoText(o.c)}`;
  }
  return `${orbLabel(o)} — ${getImpactInfo(o.i)}`;
}

function corePassiveTooltip(core: Core): string {
  const info = getCoreInfo(core);
  return `Passive: ${info.passive} Weakness: ${info.weakness}`;
}

function getFirstTurnHint(core: Core) {
  switch (core) {
    case "LAND":
      return "Recommended first turn: play a Terraform early to trigger the free Land terraform and aim for 3 total.";
    case "WATER":
      return "Recommended first turn: build Terraform, then consider a Water Swap to align your best slots.";
    case "ICE":
      return "Recommended first turn: focus on Terraform while your Ice Shield is ready; impacts are safer to absorb.";
    case "LAVA":
      return "Recommended first turn: consider an early impact to leverage +1 severity pressure.";
    case "GAS":
      return "Recommended first turn: Shift-click redraw once to fish for key Terraform or Colonize.";
    default:
      return "Recommended first turn: establish Terraform and set up for Colonize types.";
  }
}

export default function App() {
  const initialSeed = useMemo(() => Date.now(), []);
  const initial = useMemo(() => newGame("LOCAL_2P", "LAND", "ICE", initialSeed), [initialSeed]);
  const [history, setHistory] = useState<HistoryState<GameState>>({
    past: [],
    present: initial,
    future: [],
  });
  const state = history.present;
  const [lastAction, setLastAction] = useState<Action | null>(null);

  const [screen, setScreen] = useState<Screen>("SPLASH");
  const [mode] = useState<Mode>("LOCAL_2P"); // Local 2P wired
  const [p0Core, setP0Core] = useState<Core>("LAND");
  const [p1Core, setP1Core] = useState<Core>("ICE");
  const [playVsComputer, setPlayVsComputer] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AiConfig["difficulty"]>("EASY");
  const [aiSpeed, setAiSpeed] = useState<AiConfig["speed"]>("NORMAL");
  const [aiPaused, setAiPaused] = useState(false);
  const [selected, setSelected] = useState<Selected>({ kind: "NONE" });
  const [hoveredImpactIndex, setHoveredImpactIndex] = useState<number | null>(null);
  const [seedInput, setSeedInput] = useState<string>(() => String(initialSeed));
  const [showInspector, setShowInspector] = useState(false);
  const [showDeterminismTools, setShowDeterminismTools] = useState(false);
  const [impactTarget, setImpactTarget] = useState<ImpactTargetChoice>("OPPONENT");
  const [showHowTo, setShowHowTo] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<SavePayloadV1 | null>(null);
  const [replayExportOpen, setReplayExportOpen] = useState(false);
  const [replayImportOpen, setReplayImportOpen] = useState(false);
  const [replayExportCode, setReplayExportCode] = useState("");
  const [replayImportCode, setReplayImportCode] = useState("");
  const [replayImportError, setReplayImportError] = useState<string | null>(null);
  const [replayImportBundle, setReplayImportBundle] = useState<ReplayBundleV1 | null>(null);
  const [actionLog, setActionLog] = useState<ReplayEntryV1[]>([]);
  const [uiEvents, setUiEvents] = useState<UIEvent[]>([]);
  const [arenaEvent, setArenaEvent] = useState<UIEvent | null>(null);
  const [flashState, setFlashState] = useState<{
    target: 0 | 1;
    slots: number[];
    until: number;
    fxImpact?: Impact;
  } | null>(null);
  const pendingDiffRef = useRef<PendingDiff>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<GuideMode>("GUIDED");
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [lastActionEvent, setLastActionEvent] = useState<ActionEvent | null>(null);
  const [turnEvents, setTurnEvents] = useState<ActionEvent[]>([]);
  const [turnRecap, setTurnRecap] = useState<TurnRecap | null>(null);
  const [turnRecapOpen, setTurnRecapOpen] = useState(false);
  const [corePulse, setCorePulse] = useState<{ player: 0 | 1; key: string; until: number } | null>(null);
  const [progressPulse, setProgressPulse] = useState<{
    0: { types: ColonizeType[]; until: number } | null;
    1: { types: ColonizeType[]; until: number } | null;
  }>({ 0: null, 1: null });
  const [winCelebration, setWinCelebration] = useState<{ player: 0 | 1; until: number } | null>(null);
  const [turnHandoff, setTurnHandoff] = useState<{ open: boolean; player: 0 | 1 } | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const prevActiveRef = useRef(state.active);
  const prevPhaseRef = useRef(state.phase);
  const lastImpactEventRef = useRef<ImpactResolvedSummary | null>(null);
  const lastImpactProcessedRef = useRef<number | null>(null);
  const prevProgressRef = useRef<{ 0: ProgressState; 1: ProgressState } | null>(null);
  const autosaveAtRef = useRef(0);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveStateRef = useRef<GameState | null>(null);
  const initialStateRef = useRef<GameState | null>(null);
  const replayEntryCounterRef = useRef(0);
  const drawRef = useRef<HTMLButtonElement | null>(null);
  const endPlayRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Ensure every fresh mount starts on the splash screen.
    // This avoids browsers restoring an in-progress screen from a cached session state.
    setScreen("SPLASH");
  }, []);
  const advanceRef = useRef<HTMLButtonElement | null>(null);
  const undoRef = useRef<HTMLButtonElement | null>(null);
  const stateRef = useRef(state);
  const uiOverlayRef = useRef(false);
  const aiConfigRef = useRef<AiConfig>({
    enabled: false,
    player: 1,
    difficulty: "EASY",
    speed: "NORMAL",
  });
  const aiRunnerRef = useRef<ReturnType<typeof createAiRunner> | null>(null);

  // Water swap (two-click) selection; only active if selected.kind === NONE
  const [waterSwapPick, setWaterSwapPick] = useState<number | null>(null);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) return;
    const root = window as Window & {
      __po_validate?: (intent: ActionIntent) => ReturnType<typeof validateIntent>;
    };
    root.__po_validate = (intent: ActionIntent) => validateIntent(state, intent, validationCtx);
    return () => {
      delete root.__po_validate;
    };
  }, [isDev, state, validationCtx]);

  const containerStyle: React.CSSProperties = {
    fontFamily: "system-ui, sans-serif",
    padding: 12,
    width: "100%",
    maxWidth: 1200,
    boxSizing: "border-box",
    margin: "0 auto",
  };

  const active = state.active;
  const other: 0 | 1 = active === 0 ? 1 : 0;

  const activeHand = state.players[active].hand;

  const p0Progress = useMemo(
    () => computeProgressFromPlanet(state.players[0].planet.slots),
    [state.players[0].planet.slots]
  );
  const p1Progress = useMemo(
    () => computeProgressFromPlanet(state.players[1].planet.slots),
    [state.players[1].planet.slots]
  );
  const p0Viz = useMemo(() => computePlanetViz(state.players[0].planet.slots), [state.players[0].planet.slots]);
  const p1Viz = useMemo(() => computePlanetViz(state.players[1].planet.slots), [state.players[1].planet.slots]);

  const playsRemaining = state.counters.playsRemaining;
  const impactsRemaining = state.counters.impactsRemaining;

  const isPlayPhase = state.phase === "PLAY";
  const isLastPlay = isPlayPhase && playsRemaining === 1;
  const endPlayReady = isPlayPhase && playsRemaining === 0 && impactsRemaining === 0;

  const validationCtx = useMemo(
    () => ({
      activePlayer: active,
      playsRemaining,
      impactsRemaining,
      abilitiesEnabled: (p: 0 | 1) => abilitiesEnabled(state, p),
      handSizeLimit: DEFAULT_HAND_SIZE_LIMIT,
      hasUndoHistory: history.past.length > 0 && mode === "LOCAL_2P" && state.phase !== "GAME_OVER",
    }),
    [active, history.past.length, impactsRemaining, mode, playsRemaining, state],
  );

  const drawDisabledReason = getButtonDisabledReason(state, "DRAW", validationCtx);
  const endPlayDisabledReason = getButtonDisabledReason(state, "END_PLAY", validationCtx);
  const advanceDisabledReason = getButtonDisabledReason(state, "ADVANCE", validationCtx);

  const canDraw = drawDisabledReason === null;
  const canEndPlay = endPlayDisabledReason === null;
  const canAdvance = advanceDisabledReason === null;
  const advanceReady = !isPlayPhase && canAdvance;
  const canPlayImpact =
    selected.kind === "HAND" &&
    selected.orb.kind === "IMPACT" &&
    validateIntent(
      state,
      { type: "PLAY_IMPACT", handIndex: selected.handIndex, target: impactTarget === "SELF" ? active : other },
      validationCtx,
    ).ok;
  const showDiscard = state.phase === "DRAW" && isHandOverflow(state);
  const canUndo = validationCtx.hasUndoHistory ?? false;

  const canWaterSwap = validateIntent(state, { type: "WATER_SWAP", a: 0, b: 1 }, validationCtx).ok;

  const canGasRedraw =
    activeHand.length > 0 && validateIntent(state, { type: "GAS_REDRAW", handIndex: 0 }, validationCtx).ok;

  const allowAutoFocus = useMemo(() => {
    if (typeof window === "undefined") return true;
    if (typeof window.matchMedia !== "function") return true;
    return window.matchMedia("(pointer: fine)").matches;
  }, []);

  useEffect(() => {
    if (!flashState) return;
    const ms = Math.max(0, flashState.until - Date.now());
    const timer = window.setTimeout(() => setFlashState(null), ms);
    return () => window.clearTimeout(timer);
  }, [flashState]);

  useEffect(() => {
    if (!corePulse) return;
    const ms = Math.max(0, corePulse.until - Date.now());
    const timer = window.setTimeout(() => setCorePulse(null), ms);
    return () => window.clearTimeout(timer);
  }, [corePulse]);

  useEffect(() => {
    if (!progressPulse[0] && !progressPulse[1]) return;
    const timers: number[] = [];
    (["0", "1"] as const).forEach((playerKey) => {
      const player = Number(playerKey) as 0 | 1;
      const entry = progressPulse[player];
      if (!entry) return;
      const ms = Math.max(0, entry.until - Date.now());
      const timer = window.setTimeout(() => {
        setProgressPulse((prev) => (prev[player]?.until === entry.until ? { ...prev, [player]: null } : prev));
      }, ms);
      timers.push(timer);
    });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [progressPulse]);

  useEffect(() => {
    if (!winCelebration) return;
    const ms = Math.max(0, winCelebration.until - Date.now());
    const timer = window.setTimeout(() => setWinCelebration(null), ms);
    return () => window.clearTimeout(timer);
  }, [winCelebration]);

  function pushUiEvent(event: UIEvent) {
    setUiEvents((prev) => [...prev.slice(-24), event]);
    setArenaEvent(event);
  }

  function emitActionEvent(event: ActionEvent) {
    setLastActionEvent(event);
    setTurnEvents((prev) => [...prev.slice(-40), event]);
  }

  useEffect(() => {
    if (screen !== "GAME") return;
    if (hasSeenTutorial()) return;
    setTutorialMode("GUIDED");
    setTutorialIndex(0);
    setTutorialOpen(true);
  }, [screen]);

  useEffect(() => {
    if (!pendingDiffRef.current) return;

    const resolved = resolvePendingDiff(pendingDiffRef.current, state);
    if (!resolved) return;

    setArenaEvent(resolved);
    setUiEvents((prev) => [resolved, ...prev]);

    setFlashState({
      target: resolved.target,
      slots: resolved.affectedSlots,
      until: Date.now() + 900,
      fxImpact: resolved.impact,
    });

    pendingDiffRef.current = null;
  }, [state]);

  useEffect(() => {
    if (arenaEvent?.kind === "IMPACT_RESOLVED") {
      lastImpactEventRef.current = arenaEvent;
    }
  }, [arenaEvent]);

  useEffect(() => {
    if (arenaEvent?.kind === "IMPACT_RESOLVED") {
      clearSelection();
    }
  }, [arenaEvent]);

  useEffect(() => {
    if (screen !== "GAME") {
      prevStateRef.current = state;
      return;
    }
    const prev = prevStateRef.current;
    const lastImpact = lastImpactEventRef.current;
    const shouldUseImpact =
      lastImpact && lastImpact.at !== lastImpactProcessedRef.current ? lastImpact : undefined;
    if (prev) {
      const events = deriveCoreFeedback(prev, state, shouldUseImpact);
      let nextPulse: { player: 0 | 1; key: string } | null = null;
      events.forEach((event) => {
        if (event.kind === "TOAST") {
          const toastId = `${event.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          pushUniqueToast(
            `turn-${state.turn}-p${event.player}-${event.key}`,
            {
              id: toastId,
              tone: event.tone,
              title: event.title,
              detail: event.detail,
              at: Date.now(),
            },
            1500,
          );
        } else if (event.kind === "CORE_PULSE") {
          nextPulse = { player: event.player, key: event.key };
        }
      });
      if (nextPulse) {
        setCorePulse({ ...nextPulse, until: Date.now() + 900 });
      }
    }
    if (shouldUseImpact) {
      lastImpactProcessedRef.current = shouldUseImpact.at;
    }
    prevStateRef.current = state;
  }, [screen, state]);

  useEffect(() => {
    const next: { 0: ProgressState; 1: ProgressState } = { 0: p0Progress, 1: p1Progress };
    if (screen !== "GAME") {
      prevProgressRef.current = next;
      return;
    }
    const prev = prevProgressRef.current;
    if (!prev) {
      prevProgressRef.current = next;
      return;
    }

    const now = Date.now();
    ([0, 1] as const).forEach((player) => {
      const newlyUnlocked = diffProgress(prev[player], next[player]);
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach((type) => {
          pushToast({
            id: `unlock-${player}-${type}-${now}-${Math.random().toString(36).slice(2, 7)}`,
            tone: "good",
            title: `Unlocked: ${COLONIZE_LABELS[type]}`,
            detail: "New life form established.",
            at: now,
          });
        });
        setProgressPulse((current) => ({
          ...current,
          [player]: { types: newlyUnlocked, until: now + 900 },
        }));
      }

      if (!prev[player].hasAll && next[player].hasAll) {
        pushToast({
          id: `unlock-all-${player}-${now}-${Math.random().toString(36).slice(2, 7)}`,
          tone: "good",
          title: "All 4 life types unlocked!",
          detail: `Player ${player + 1} completed colonization.`,
          at: now,
        });
        setWinCelebration({ player, until: now + 1400 });
      }
    });

    prevProgressRef.current = next;
  }, [p0Progress, p1Progress, screen]);

  useEffect(() => {
    if (!tutorialOpen) return;
    if (tutorialMode !== "GUIDED") return;
    if (!lastActionEvent) return;
    const nextIndex = nextIndexOnEvent(
      TUTORIAL_STEPS,
      tutorialIndex,
      lastActionEvent,
      state.active,
      tutorialMode
    );
    if (nextIndex !== tutorialIndex) {
      setTutorialIndex(nextIndex);
    }
  }, [lastActionEvent, state.active, tutorialIndex, tutorialMode, tutorialOpen]);

  const impactPreview: ImpactPreview | null = useMemo(() => {
    if (screen !== "GAME") return null;

    if (selected.kind === "HAND" && selected.orb.kind === "IMPACT") {
      const target = impactTarget === "SELF" ? active : other;
      return computeImpactPreview(state, selected.orb.i, active, target);
    }

    if (hoveredImpactIndex !== null) {
      const orb = activeHand[hoveredImpactIndex];
      if (orb?.kind === "IMPACT") {
        return computeImpactPreview(state, orb.i, active, other);
      }
    }

    return null;
  }, [active, activeHand, hoveredImpactIndex, impactTarget, other, screen, selected, state]);

  const coachHints = useMemo(() => {
    if (screen !== "GAME") return [];
    return getCoachHints(state);
  }, [screen, state]);

  const usedKeys = useMemo(
    () => ({
      0: usedAbilityKeys(state.players[0]),
      1: usedAbilityKeys(state.players[1]),
    }),
    [state],
  );

  function resolveSeed() {
    const trimmed = seedInput.trim();
    if (!trimmed) return Date.now();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function dispatchWithLog(action: Action) {
    const before = state;
    const intent = toActionIntent(action);
    if (intent) {
      const validation = validateIntent(before, intent, validationCtx);
      if (!validation.ok) {
        pushToast({
          id: `invalid-action-${Date.now()}`,
          tone: "warn",
          title: "Action blocked",
          detail: validation.reason,
          at: Date.now(),
        });
        return;
      }
    }
    const computedNext = reducer(before, action);
    setLastAction(action);
    setHistory((prev) => {
      const nextPresent = prev.present === before ? computedNext : reducer(prev.present, action);
      if (nextPresent === prev.present) return prev;
      if (action.type === "NEW_GAME") {
        return { past: [], present: nextPresent, future: [] };
      }
      if (!shouldRecordHistory(action)) {
        return { ...prev, present: nextPresent, future: [] };
      }
      return pushHistory(prev, nextPresent, HISTORY_LIMIT);
    });

    if (computedNext === before) return;
    if (action.type === "NEW_GAME") {
      initialStateRef.current = structuredClone(computedNext);
      setActionLog([]);
      replayEntryCounterRef.current = 0;
      setReplayImportBundle(null);
      return;
    }
    if (!shouldRecordReplay(action)) return;
    const result = getDrawResult(action, before, computedNext, before.active);
    const entry: ReplayEntryV1 = {
      v: 1,
      id: `${Date.now()}-${replayEntryCounterRef.current++}`,
      at: Date.now(),
      player: before.active,
      type: action.type,
      payload: actionPayload(action),
      ...(result ? { result } : {}),
    };
    setActionLog((prev) => [...prev, entry]);
  }

  function startGame() {
    resetTransientUi();
    const seed = resolveSeed();
    setSeedInput(String(seed));
    dispatchWithLog({ type: "NEW_GAME", mode: playVsComputer ? "VS_AI" : mode, coreP0: p0Core, coreP1: p1Core, seed });
    setScreen("GAME");
  }

  const menuOpen = gameMenuOpen || viewMenuOpen || helpMenuOpen;
  const uiOverlayOpen =
    menuOpen ||
    exportOpen ||
    importOpen ||
    replayExportOpen ||
    replayImportOpen ||
    tutorialOpen ||
    turnRecapOpen ||
    showHowTo ||
    shortcutsOpen;
  const handoffBlocked =
    menuOpen ||
    exportOpen ||
    importOpen ||
    replayExportOpen ||
    replayImportOpen ||
    tutorialOpen ||
    showHowTo ||
    shortcutsOpen ||
    logOpen;

  const aiConfig: AiConfig = {
    enabled: playVsComputer && !aiPaused,
    player: 1,
    difficulty: aiDifficulty,
    speed: aiSpeed,
  };

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    uiOverlayRef.current = uiOverlayOpen;
  }, [uiOverlayOpen]);

  useEffect(() => {
    aiConfigRef.current = aiConfig;
  }, [aiConfig]);

  const aiAbilitiesEnabled = useCallback((snapshot: GameState, p: 0 | 1) => {
    const until = snapshot.players[p].abilities.disabled_until_turn;
    return until === undefined || snapshot.turn > until;
  }, []);

  const dispatchIntent = useCallback(
    (intent: ActionIntent) => {
      const snapshot = stateRef.current;
      const ctx = {
        activePlayer: snapshot.active,
        playsRemaining: snapshot.counters.playsRemaining,
        impactsRemaining: snapshot.counters.impactsRemaining,
        abilitiesEnabled: (p: 0 | 1) => aiAbilitiesEnabled(snapshot, p),
        handSizeLimit: DEFAULT_HAND_SIZE_LIMIT,
        hasUndoHistory: history.past.length > 0 && mode === "LOCAL_2P" && snapshot.phase !== "GAME_OVER",
      };
      const check = validateIntent(snapshot, intent, ctx);
      if (!check.ok) {
        return false;
      }
      const action = intentToAction(intent);
      if (!action) return false;
      dispatchWithLog(action);
      return true;
    },
    [aiAbilitiesEnabled, history.past.length, mode],
  );

  useEffect(() => {
    aiRunnerRef.current = createAiRunner({
      ai: aiConfigRef.current,
      dispatchIntent,
      validateIntent,
      getState: () => stateRef.current,
      uiOverlayOpen: () => uiOverlayRef.current,
      isGameOver: () => stateRef.current.phase === "GAME_OVER",
    });
    return () => {
      aiRunnerRef.current?.cancel();
      aiRunnerRef.current = null;
    };
  }, [dispatchIntent]);

  useEffect(() => {
    if (!playVsComputer) {
      aiRunnerRef.current?.cancel();
      return;
    }
    if (screen !== "GAME") {
      aiRunnerRef.current?.cancel();
      return;
    }
    if (state.phase === "GAME_OVER" || uiOverlayOpen || state.active !== aiConfig.player) {
      aiRunnerRef.current?.cancel();
      return;
    }
    aiRunnerRef.current?.startTurn();
    return () => {
      aiRunnerRef.current?.cancel();
    };
  }, [aiConfig.player, playVsComputer, screen, state.active, state.phase, uiOverlayOpen]);

  const closeMenus = useCallback(() => {
    setGameMenuOpen(false);
    setViewMenuOpen(false);
    setHelpMenuOpen(false);
  }, []);

  const toggleMenu = useCallback((menu: "game" | "view" | "help") => {
    setGameMenuOpen((prev) => (menu === "game" ? !prev : false));
    setViewMenuOpen((prev) => (menu === "view" ? !prev : false));
    setHelpMenuOpen((prev) => (menu === "help" ? !prev : false));
  }, []);

  const menuAction = useCallback(
    (action: () => void) => () => {
      action();
      closeMenus();
    },
    [closeMenus]
  );

  const shortcutContext = useMemo<ShortcutContext>(
    () => ({
      canDraw,
      canEndPlay,
      canAdvance,
      canUndo,
      uiOverlayOpen,
      menuOpen,
      closeMenus,
      toggleLog: () => setLogOpen((prev) => !prev),
      openTutorial: handleOpenTutorial,
      clearSelection: clearSelectionAndOverlays,
      onDraw: handleDraw2,
      onEndPlay: handleEndPlay,
      onAdvance: handleAdvance,
      onUndo: handleUndo,
    }),
    [
      canAdvance,
      canDraw,
      canEndPlay,
      canUndo,
      clearSelectionAndOverlays,
      closeMenus,
      handleAdvance,
      handleDraw2,
      handleEndPlay,
      handleOpenTutorial,
      handleUndo,
      menuOpen,
      uiOverlayOpen,
    ]
  );

  useEffect(() => {
    if (screen !== "GAME") return;
    const onKeyDown = (e: KeyboardEvent) => handleKeyDown(e, shortcutContext);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, shortcutContext]);

  useEffect(() => {
    if (screen !== "GAME") {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }
    if (autosaveStateRef.current === state) {
      return;
    }
    const now = Date.now();
    const elapsed = now - autosaveAtRef.current;
    const saveNow = (next: GameState) => {
      const result = saveToLocalStorage(next);
      if (result.ok) {
        autosaveAtRef.current = Date.now();
        autosaveStateRef.current = next;
      }
    };
    if (elapsed >= 2000) {
      saveNow(state);
      return;
    }
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    const delay = Math.max(0, 2000 - elapsed);
    autosaveTimerRef.current = window.setTimeout(() => {
      saveNow(state);
      autosaveTimerRef.current = null;
    }, delay);
  }, [screen, state]);

  useEffect(() => {
    if (!allowAutoFocus) {
      prevPhaseRef.current = state.phase;
      return;
    }
    if (state.phase === "PLAY" && playsRemaining === 0 && impactsRemaining === 0) {
      endPlayRef.current?.focus();
    }
    const prevPhase = prevPhaseRef.current;
    if (prevPhase !== state.phase) {
      if (prevPhase === "PLAY" && (state.phase === "RESOLVE" || state.phase === "CHECK_WIN")) {
        advanceRef.current?.focus();
      }
    }
    prevPhaseRef.current = state.phase;
  }, [allowAutoFocus, impactsRemaining, playsRemaining, state.phase]);

  useEffect(() => {
    if (screen !== "GAME" || lastAction?.type === "NEW_GAME") {
      prevActiveRef.current = state.active;
      return;
    }
    const prev = prevActiveRef.current;
    if (prev !== state.active && !handoffBlocked) {
      setTurnHandoff({ open: true, player: state.active });
    }
    prevActiveRef.current = state.active;
  }, [handoffBlocked, lastAction, screen, state.active]);


  if (screen === "SPLASH") {
    return (
      <div style={{ ...containerStyle, display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: 720, textAlign: "center" }}>
          <img
            src={logoUrl}
            alt="Primordial Orbs"
            style={{ width: "min(520px, 90vw)", height: "auto", borderRadius: 18, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          />
          <div style={{ marginTop: 16, fontWeight: 800, letterSpacing: 2 }}>PRIMORDIAL ORBS</div>
          <div style={{ marginTop: 6, color: "#666" }}>Terraform • Evolve • Destabilize</div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setScreen("SETUP")}
              style={{ padding: "10px 14px", borderRadius: 10 }}
              title="Proceed to setup"
            >
              Enter the Cataclysm Arena
            </button>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>
            Click to enter the Cataclysm Arena
          </div>
        </div>
      </div>
    );
  }

  if (screen === "SETUP") {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Setup</h2>
          <button onClick={() => setScreen("SPLASH")}>Back</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div style={{ border: "1px solid #bbb", borderRadius: 14, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Choose Cores</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Player 1 Core</div>
                <select
                  value={p0Core}
                  onChange={(e) => setP0Core(e.target.value as Core)}
                  style={{ width: "100%", padding: 10, borderRadius: 10 }}
                >
                  {CORES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <CoreTooltip title="Player 1" core={p0Core} />
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Player 2 Core</div>
                <select
                  value={p1Core}
                  onChange={(e) => setP1Core(e.target.value as Core)}
                  style={{ width: "100%", padding: 10, borderRadius: 10 }}
                >
                  {CORES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <CoreTooltip title="Player 2" core={p1Core} />
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #bbb", borderRadius: 14, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Match Settings</h3>
            <div style={{ marginTop: 6 }}>
              <div><b>Mode:</b> Local Game</div>
              <div style={{ marginTop: 6 }}><b>Planet Size:</b> Medium (fixed)</div>
              <div style={{ marginTop: 6 }}><b>Win:</b> 4 Colonization types</div>
              <div style={{ marginTop: 6 }}><b>Turn:</b> Draw • Hand cap 3 • Play 2 • Impact 1</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Seed (for reproducible games)</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder="e.g. 12345"
                  style={{ flex: "1 1 180px", padding: 10, borderRadius: 10, border: "1px solid #bbb" }}
                />
                <button
                  type="button"
                  onClick={() => setSeedInput(String(Date.now()))}
                  style={{ padding: "10px 12px", borderRadius: 10 }}
                >
                  Randomize
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                Use the same seed to replay a game flow.
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 10, border: "1px solid #cfd8ea", borderRadius: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={playVsComputer}
                  onChange={(e) => setPlayVsComputer(e.target.checked)}
                />
                <span style={{ fontWeight: 700 }}>Play vs Computer</span>
              </label>
              {playVsComputer && (
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Difficulty</span>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as AiConfig["difficulty"])}
                      style={{ padding: 8, borderRadius: 8 }}
                    >
                      <option value="EASY">Easy</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>AI Speed</span>
                    <select
                      value={aiSpeed}
                      onChange={(e) => setAiSpeed(e.target.value as AiConfig["speed"])}
                      style={{ padding: 8, borderRadius: 8 }}
                    >
                      <option value="FAST">Fast</option>
                      <option value="NORMAL">Normal</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={startGame} style={{ padding: "10px 14px", borderRadius: 10 }}>
                Start Game
              </button>
              <button
                onClick={() => { setP0Core(p1Core); setP1Core(p0Core); }}
                style={{ padding: "10px 14px", borderRadius: 10 }}
              >
                Swap Cores
              </button>
              <button onClick={() => setShowHowTo(true)} style={{ padding: "10px 14px", borderRadius: 10 }}>
                How to Play
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <button
                type="button"
                onClick={openRulebook}
                style={{ background: "none", border: "none", padding: 0, color: "#1f5fbf", cursor: "pointer" }}
              >
                Read the full rulebook
              </button>
            </div>
          </div>
        </div>
        {showHowTo && <HowToOverlay onClose={() => setShowHowTo(false)} />}
      </div>
    );
  }

  function clearSelection() {
    setSelected({ kind: "NONE" });
    setWaterSwapPick(null);
    setImpactTarget("OPPONENT");
  }

  function resetTransientUi() {
    clearSelection();
    setHoveredImpactIndex(null);
    setArenaEvent(null);
    setFlashState(null);
    setTurnEvents([]);
    setTurnRecap(null);
    setTurnRecapOpen(false);
    setTurnHandoff(null);
    pendingDiffRef.current = null;
  }

  function clearUiForLoad() {
    resetTransientUi();
    setShowHowTo(false);
    setTutorialOpen(false);
    setTutorialIndex(0);
    setTutorialMode("GUIDED");
    setLogOpen(false);
    setUiEvents([]);
    setArenaEvent(null);
    setFlashState(null);
    setWinCelebration(null);
    setCorePulse(null);
    setProgressPulse({ 0: null, 1: null });
    setLastAction(null);
    setLastActionEvent(null);
    setTurnEvents([]);
    setGameMenuOpen(false);
    setViewMenuOpen(false);
    setHelpMenuOpen(false);
    setShortcutsOpen(false);
    setReplayExportOpen(false);
    setReplayImportOpen(false);
  }

  function applyLoadedState(payload: SavePayloadV1) {
    clearUiForLoad();
    setHistory({ past: [], present: payload.state, future: [] });
    setSeedInput(String(payload.state.seed));
    autosaveStateRef.current = payload.state;
    autosaveAtRef.current = Date.now();
    initialStateRef.current = structuredClone(payload.state);
    setActionLog([]);
    replayEntryCounterRef.current = 0;
    setReplayImportBundle(null);
  }

  function handleSaveNow() {
    const result = saveToLocalStorage(state);
    if (result.ok) {
      pushToast({
        id: `save-${Date.now()}`,
        tone: "good",
        title: "Saved.",
        at: Date.now(),
      });
    } else {
      pushToast({
        id: `save-error-${Date.now()}`,
        tone: "warn",
        title: "Save failed.",
        detail: result.error,
        at: Date.now(),
      });
    }
  }

  function handleLoadNow() {
    aiRunnerRef.current?.cancel();
    const result = loadFromLocalStorage();
    if (result.ok) {
      applyLoadedState(result.payload);
      pushToast({
        id: `load-${Date.now()}`,
        tone: "good",
        title: "Loaded.",
        at: Date.now(),
      });
    } else {
      pushToast({
        id: `load-error-${Date.now()}`,
        tone: "warn",
        title: "Load failed.",
        detail: result.error,
        at: Date.now(),
      });
    }
  }

  function handleExportOpen() {
    setExportCode(exportMatchCode(state));
    setExportOpen(true);
  }

  async function handleCopyExport() {
    try {
      await navigator.clipboard.writeText(exportCode);
      pushToast({
        id: `copy-${Date.now()}`,
        tone: "good",
        title: "Code copied.",
        at: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard unavailable.";
      pushToast({
        id: `copy-error-${Date.now()}`,
        tone: "warn",
        title: "Copy failed.",
        detail: message,
        at: Date.now(),
      });
    }
  }

  function handleImportValidate() {
    const result = importMatchCode(importCode);
    if (result.ok) {
      setImportPayload(result.payload);
      setImportError(null);
      return;
    }
    setImportPayload(null);
    setImportError(result.error);
  }

  function handleImportLoad() {
    const result = importMatchCode(importCode);
    if (result.ok) {
      applyLoadedState(result.payload);
      setImportOpen(false);
      setImportCode("");
      setImportPayload(null);
      setImportError(null);
      pushToast({
        id: `import-${Date.now()}`,
        tone: "good",
        title: "Match code loaded.",
        at: Date.now(),
      });
    } else {
      setImportPayload(null);
      setImportError(result.error);
    }
  }

  function buildReplayBundle(): ReplayBundleV1 | null {
    const initial = initialStateRef.current ?? state;
    if (!initial) return null;
    return {
      v: 1,
      app: "primordial-orbs",
      createdAt: Date.now(),
      initial,
      entries: actionLog,
    };
  }

  function handleReplayExportOpen() {
    const bundle = buildReplayBundle();
    if (!bundle) {
      pushToast({
        id: `replay-export-missing-${Date.now()}`,
        tone: "warn",
        title: "Replay unavailable.",
        detail: "No initial state recorded yet.",
        at: Date.now(),
      });
      return;
    }
    setReplayExportCode(JSON.stringify(bundle, null, 2));
    setReplayExportOpen(true);
  }

  async function handleCopyReplayExport() {
    try {
      await navigator.clipboard.writeText(replayExportCode);
      pushToast({
        id: `replay-copy-${Date.now()}`,
        tone: "good",
        title: "Replay copied.",
        at: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard unavailable.";
      pushToast({
        id: `replay-copy-error-${Date.now()}`,
        tone: "warn",
        title: "Replay copy failed.",
        detail: message,
        at: Date.now(),
      });
    }
  }

  function handleReplayImportValidate() {
    try {
      const parsed = JSON.parse(replayImportCode) as unknown;
      const result = validateReplayBundle(parsed);
      if (result.ok) {
        setReplayImportBundle(result.payload);
        setReplayImportError(null);
        return;
      }
      setReplayImportBundle(null);
      setReplayImportError(result.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON.";
      setReplayImportBundle(null);
      setReplayImportError(message);
    }
  }

  function handleReplayImportLoad() {
    try {
      const parsed = JSON.parse(replayImportCode) as unknown;
      const result = validateReplayBundle(parsed);
      if (result.ok) {
        setReplayImportBundle(result.payload);
        setReplayImportError(null);
        setReplayImportOpen(false);
        setReplayImportCode("");
        pushToast({
          id: `replay-import-${Date.now()}`,
          tone: "good",
          title: "Replay loaded.",
          at: Date.now(),
        });
        return;
      }
      setReplayImportBundle(null);
      setReplayImportError(result.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON.";
      setReplayImportBundle(null);
      setReplayImportError(message);
    }
  }

  function applyReplayState(replayed: GameState, bundle: ReplayBundleV1) {
    setHistory({ past: [], present: replayed, future: [] });
    setSeedInput(String(replayed.seed));
    autosaveStateRef.current = replayed;
    autosaveAtRef.current = Date.now();
    initialStateRef.current = structuredClone(bundle.initial);
    setActionLog(bundle.entries);
  }

  function handleDeterminismReplaceState(replayed: GameState, bundle: ReplayBundleV1) {
    applyReplayState(replayed, bundle);
    pushToast({
      id: `determinism-replace-${Date.now()}`,
      tone: "good",
      title: "State replaced from replay.",
      detail: `Applied ${bundle.entries.length} replayed actions.`,
      at: Date.now(),
    });
  }

  function handleReplayFromStart() {
    aiRunnerRef.current?.cancel();
    const bundle = replayImportBundle ?? buildReplayBundle();
    if (!bundle) {
      pushToast({
        id: `replay-missing-${Date.now()}`,
        tone: "warn",
        title: "Replay unavailable.",
        detail: "No replay bundle loaded.",
        at: Date.now(),
      });
      return;
    }
    try {
      const replayed = replayFromStart(bundle, reducer);
      applyReplayState(replayed, bundle);
      const verified =
        replayImportBundle === null ? validateReplayMatchesCurrent(replayed, state) : null;
      pushToast({
        id: `replay-done-${Date.now()}`,
        tone: verified === false ? "warn" : "good",
        title: `Replayed ${bundle.entries.length} actions.`,
        detail:
          verified === null
            ? undefined
            : verified
              ? "Replay verified."
              : "Replay mismatch detected.",
        at: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Replay failed.";
      pushToast({
        id: `replay-failed-${Date.now()}`,
        tone: "warn",
        title: "Replay failed.",
        detail: message,
        at: Date.now(),
      });
    }
  }

  function onClickHand(i: number, e: React.MouseEvent) {
    const orb = activeHand[i];
    if (!orb) return;

    // GAS passive: Shift-click any hand orb to redraw it (once per turn)
    if (e.shiftKey) {
      const redrawCheck = validateIntent(state, { type: "GAS_REDRAW", handIndex: i }, validationCtx);
      if (redrawCheck.ok) {
        dispatchWithLog({ type: "GAS_REDRAW", handIndex: i });
        emitActionEvent({ type: "GAS_REDRAW", at: Date.now(), player: active });
        clearSelection();
      }
      return;
    }

    // Selecting a hand orb exits water swap mode
    setWaterSwapPick(null);
    if (orb.kind === "IMPACT") {
      setImpactTarget("OPPONENT");
    }
    setSelected({ kind: "HAND", handIndex: i, orb });
  }

  function onClickSlot(slotIndex: number) {
    // WATER passive: when nothing selected from hand, allow swap by clicking two terraform slots
    if (canWaterSwap && selected.kind === "NONE") {
      if (waterSwapPick === null) {
        setWaterSwapPick(slotIndex);
      } else {
        const swapCheck = validateIntent(state, { type: "WATER_SWAP", a: waterSwapPick, b: slotIndex }, validationCtx);
        if (swapCheck.ok) {
          dispatchWithLog({ type: "WATER_SWAP", slotA: waterSwapPick, slotB: slotIndex });
          emitActionEvent({ type: "WATER_SWAP", at: Date.now(), player: active });
        }
        setWaterSwapPick(null);
      }
      return;
    }

    if (selected.kind !== "HAND") return;

    const { handIndex, orb } = selected;

    if (orb.kind === "TERRAFORM") {
      dispatchWithLog({ type: "PLAY_TERRAFORM", handIndex, slotIndex });
      emitActionEvent({ type: "PLAY_TERRAFORM", at: Date.now(), player: active, terra: orb.t });
      pushUiEvent({ kind: "PLACE", at: Date.now(), player: active, slotIndex });
      clearSelection();
      return;
    }
    if (orb.kind === "COLONIZE") {
      dispatchWithLog({ type: "PLAY_COLONIZE", handIndex, slotIndex });
      emitActionEvent({ type: "PLAY_COLONIZE", at: Date.now(), player: active, colonize: orb.c });
      pushUiEvent({ kind: "PLACE", at: Date.now(), player: active, slotIndex });
      clearSelection();
      return;
    }
  }

  function onDiscardIndex(i: number) {
    dispatchWithLog({ type: "DISCARD_FROM_HAND", index: i });
    clearSelection();
  }

  function onPlaySelectedImpact() {
    if (selected.kind !== "HAND") return;
    if (selected.orb.kind !== "IMPACT") return;
    if (state.phase !== "PLAY") return;
    if (state.counters.playsRemaining <= 0 || state.counters.impactsRemaining <= 0) return;

    const target: 0 | 1 = impactTarget === "SELF" ? active : other;
    const now = Date.now();
    pendingDiffRef.current = beginPendingImpactDiff(state, selected.orb.i, active, target);
    setArenaEvent({
      kind: "IMPACT_CAST",
      at: now,
      impact: selected.orb.i,
      source: active,
      target,
    });
    dispatchWithLog({ type: "PLAY_IMPACT", handIndex: selected.handIndex, target });
    emitActionEvent({ type: "PLAY_IMPACT", at: Date.now(), player: active, impact: selected.orb.i, target });
    clearSelection();
  }

  function onCoachAction(hint: CoachHint) {
    if (hint.actionLabel === "Draw" && canDraw) {
      clearSelection();
      dispatchWithLog({ type: "DRAW_2" });
      emitActionEvent({ type: "DRAW_2", at: Date.now(), player: active });
      pushUiEvent({ kind: "DRAW", at: Date.now(), player: active });
    }
  }

  function handleNewGame() {
    aiRunnerRef.current?.cancel();
    resetTransientUi();
    const seed = resolveSeed();
    setSeedInput(String(seed));
    dispatchWithLog({
      type: "NEW_GAME",
      mode: playVsComputer ? "VS_AI" : "LOCAL_2P",
      coreP0: p0Core,
      coreP1: p1Core,
      seed,
    });
  }

  function handleDraw2() {
    clearSelection();
    dispatchWithLog({ type: "DRAW_2" });
    emitActionEvent({ type: "DRAW_2", at: Date.now(), player: active });
    pushUiEvent({ kind: "DRAW", at: Date.now(), player: active });
  }

  function handleEndPlay() {
    clearSelection();
    dispatchWithLog({ type: "END_PLAY" });
    emitActionEvent({ type: "END_PLAY", at: Date.now(), player: active });
  }

  function handleAdvance() {
    clearSelection();
    const recapPlayer = active;
    const recap = buildTurnRecap(turnEvents, recapPlayer);
    setTurnRecap(recap);
    setTurnRecapOpen(true);
    dispatchWithLog({ type: "ADVANCE" });
    emitActionEvent({ type: "ADVANCE", at: Date.now(), player: active });
    setTurnEvents([]);
  }

  function handleUndo() {
    aiRunnerRef.current?.cancel();
    clearSelection();
    const undoCheck = validateIntent(state, { type: "UNDO" }, validationCtx);
    if (!undoCheck.ok) {
      pushToast({
        id: `undo-blocked-${Date.now()}`,
        tone: "warn",
        title: "Undo unavailable",
        detail: undoCheck.reason,
        at: Date.now(),
      });
      return;
    }
    setHistory((prev) => undo(prev));
  }

  function handleOpenGuidedTutorial() {
    setTutorialMode("GUIDED");
    setTutorialIndex(0);
    setTutorialOpen(true);
  }

  function handleOpenTutorial() {
    setTutorialMode("MANUAL");
    setTutorialIndex(0);
    setTutorialOpen(true);
  }

  function clearSelectionAndOverlays() {
    clearSelection();
    setShowHowTo(false);
    setTutorialOpen(false);
    setTurnRecapOpen(false);
    setTurnRecap(null);
    setLogOpen(false);
    setShortcutsOpen(false);
  }

  const topbarTitle = "Primordial Orbs";
  const gameOverLabel =
    state.phase === "GAME_OVER" ? `Winner: Player ${String((state.winner ?? 0) + 1)}` : null;

  const activeFlashSlots = flashState?.target === active ? flashState.slots : [];
  const otherFlashSlots = flashState?.target === other ? flashState.slots : [];
  const activeFlashFx = flashState?.target === active ? flashState.fxImpact ?? null : null;
  const otherFlashFx = flashState?.target === other ? flashState.fxImpact ?? null : null;

  const logLines = state.log.slice(0, 120);

  return (
    <GameErrorBoundary onReset={() => setScreen("SETUP")}>
      <div style={containerStyle} className="app-shell game-shell">
        <ToastStack />
        {winCelebration && <WinCelebration player={winCelebration.player} />}
        <TurnRecapToast
          recap={turnRecap}
          open={turnRecapOpen}
          onDone={() => {
            setTurnRecapOpen(false);
            setTurnRecap(null);
          }}
        />
        {turnHandoff && (
          <TurnHandoffOverlay
            open={turnHandoff.open}
            player={turnHandoff.player}
            viz={turnHandoff.player === 0 ? p0Viz : p1Viz}
            onDone={() => setTurnHandoff(null)}
          />
        )}
        <div className="game-topbar">
          <div className="game-topbar-left">
            <div className="game-topbar-title">{topbarTitle}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span className="game-status-pill">Active: Player {active + 1}</span>
              {gameOverLabel && <span className="game-status-pill">{gameOverLabel}</span>}
              {state.players[active].abilities.disabled_until_turn !== undefined && !abilitiesEnabled(state, active) && (
                <span className="game-status-pill" title="Solar Flare">Abilities Disabled</span>
              )}
            </div>
          </div>

          <div className="game-topbar-right">
            <span className="game-status-pill">Phase: {state.phase}</span>
            <span className="game-status-pill">Turn: {state.turn}</span>
            {isPlayPhase && (
              <>
                <span
                  className={[
                    "game-status-pill",
                    playsRemaining === 0 ? "counter-zero" : playsRemaining === 1 ? "counter-low" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  Plays: {playsRemaining}
                </span>
                <span
                  className={[
                    "game-status-pill",
                    impactsRemaining === 0 ? "counter-zero" : impactsRemaining === 1 ? "counter-low" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  Impacts: {impactsRemaining}
                </span>
              </>
            )}
            <div className="game-topbar-menus">
              <MenuButton
                label="Game"
                open={gameMenuOpen}
                onToggle={() => toggleMenu("game")}
                onClose={closeMenus}
              >
                <MenuItem onSelect={menuAction(handleNewGame)}>New Game</MenuItem>
                <MenuItem
                  tone="danger"
                  onSelect={menuAction(() => {
                    clearSelection();
                    resetTransientUi();
                    setScreen("SETUP");
                  })}
                >
                  Quit Game
                </MenuItem>
                <MenuItem onSelect={menuAction(() => setScreen("SETUP"))}>Setup</MenuItem>
                <MenuItem onSelect={menuAction(handleSaveNow)}>Save</MenuItem>
                <MenuItem onSelect={menuAction(handleLoadNow)}>Load</MenuItem>
                <MenuItem onSelect={menuAction(handleExportOpen)}>Export Match Code</MenuItem>
                <MenuItem
                  onSelect={menuAction(() => {
                    setImportOpen(true);
                    setImportError(null);
                    setImportPayload(null);
                  })}
                >
                  Import Match Code
                </MenuItem>
                <MenuItem onSelect={menuAction(handleReplayExportOpen)}>Export Replay</MenuItem>
                <MenuItem
                  onSelect={menuAction(() => {
                    setReplayImportOpen(true);
                    setReplayImportError(null);
                    setReplayImportBundle(null);
                  })}
                >
                  Import Replay
                </MenuItem>
                <MenuItem onSelect={menuAction(handleReplayFromStart)}>Replay From Start</MenuItem>
              </MenuButton>
              <MenuButton
                label="View"
                open={viewMenuOpen}
                onToggle={() => toggleMenu("view")}
                onClose={closeMenus}
              >
                <MenuItem onSelect={menuAction(() => setLogOpen((prev) => !prev))}>
                  {logOpen ? "Hide Log" : "Show Log"}
                </MenuItem>
                {playVsComputer && (
                  <MenuItem onSelect={menuAction(() => setAiPaused((prev) => !prev))}>
                    {aiPaused ? "Resume AI" : "Pause AI"}
                  </MenuItem>
                )}
                {isDev && (
                  <>
                    <MenuItem onSelect={menuAction(() => setShowInspector((prev) => !prev))}>
                      {showInspector ? "Hide Inspector" : "Show Inspector"}
                    </MenuItem>
                    <MenuItem onSelect={menuAction(() => setShowDeterminismTools((prev) => !prev))}>
                      {showDeterminismTools ? "Hide Dev Tools" : "Dev Tools..."}
                    </MenuItem>
                  </>
                )}
              </MenuButton>
              <MenuButton
                label="Help"
                open={helpMenuOpen}
                onToggle={() => toggleMenu("help")}
                onClose={closeMenus}
              >
                <MenuItem onSelect={menuAction(handleOpenGuidedTutorial)}>Tutorial (Guided)</MenuItem>
                <MenuItem onSelect={menuAction(handleOpenTutorial)}>Tutorial (Manual)</MenuItem>
                <MenuItem onSelect={menuAction(() => setShowHowTo(true))}>How to Play</MenuItem>
                <MenuItem onSelect={menuAction(() => setShortcutsOpen(true))}>Keyboard Shortcuts</MenuItem>
                <MenuItem onSelect={menuAction(openRulebook)}>Rulebook</MenuItem>
              </MenuButton>
            </div>
          </div>
        </div>

        {exportOpen && (
          <div className="overlay-backdrop" role="dialog" aria-modal="true">
            <div className="overlay-panel" style={{ width: "min(720px, 95vw)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Match Code</h2>
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    setExportCode("");
                  }}
                >
                  Close
                </button>
              </div>
              <p style={{ marginTop: 10 }}>
                Share this code to restore the current match.
              </p>
              <textarea
                readOnly
                value={exportCode}
                rows={6}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={handleCopyExport}>
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {importOpen && (
          <div className="overlay-backdrop" role="dialog" aria-modal="true">
            <div className="overlay-panel" style={{ width: "min(720px, 95vw)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Import Match Code</h2>
                <button
                  type="button"
                  onClick={() => {
                    setImportOpen(false);
                    setImportCode("");
                    setImportError(null);
                    setImportPayload(null);
                  }}
                >
                  Close
                </button>
              </div>
              <p style={{ marginTop: 10 }}>
                Paste a match code to validate and load a saved game state.
              </p>
              <textarea
                value={importCode}
                onChange={(event) => {
                  setImportCode(event.target.value);
                  setImportError(null);
                  setImportPayload(null);
                }}
                rows={6}
                placeholder="Paste match code here"
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
              {importError && (
                <div style={{ marginTop: 8, color: "#b3261e", fontSize: 13 }}>
                  {importError}
                </div>
              )}
              {importPayload && !importError && (
                <div style={{ marginTop: 8, color: "#1b5e20", fontSize: 13 }}>
                  Code valid. Created {new Date(importPayload.createdAt).toLocaleString()}.
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={handleImportValidate}>
                  Validate
                </button>
                <button type="button" onClick={handleImportLoad}>
                  Load
                </button>
              </div>
            </div>
          </div>
        )}

        {replayExportOpen && (
          <div className="overlay-backdrop" role="dialog" aria-modal="true">
            <div className="overlay-panel" style={{ width: "min(720px, 95vw)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Replay Bundle</h2>
                <button
                  type="button"
                  onClick={() => {
                    setReplayExportOpen(false);
                    setReplayExportCode("");
                  }}
                >
                  Close
                </button>
              </div>
              <p style={{ marginTop: 10 }}>
                Export this replay bundle to reproduce or replay the match from the starting state.
              </p>
              <textarea
                readOnly
                value={replayExportCode}
                rows={8}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={handleCopyReplayExport}>
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {replayImportOpen && (
          <div className="overlay-backdrop" role="dialog" aria-modal="true">
            <div className="overlay-panel" style={{ width: "min(720px, 95vw)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Import Replay</h2>
                <button
                  type="button"
                  onClick={() => {
                    setReplayImportOpen(false);
                    setReplayImportCode("");
                    setReplayImportError(null);
                    setReplayImportBundle(null);
                  }}
                >
                  Close
                </button>
              </div>
              <p style={{ marginTop: 10 }}>
                Paste a replay bundle JSON to load it for replay.
              </p>
              <textarea
                value={replayImportCode}
                onChange={(event) => {
                  setReplayImportCode(event.target.value);
                  setReplayImportError(null);
                }}
                rows={8}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
              {replayImportError && (
                <div style={{ marginTop: 8, color: "#b3261e", fontSize: 13 }}>
                  {replayImportError}
                </div>
              )}
              {replayImportBundle && !replayImportError && (
                <div style={{ marginTop: 8, color: "#1b5e20", fontSize: 13 }}>
                  Replay bundle loaded: {replayImportBundle.entries.length} actions.
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={handleReplayImportValidate}>
                  Validate
                </button>
                <button type="button" onClick={handleReplayImportLoad}>
                  Load
                </button>
              </div>
            </div>
          </div>
        )}

        {shortcutsOpen && (
          <div className="overlay-backdrop" role="dialog" aria-modal="true">
            <div className="overlay-panel" style={{ width: "min(520px, 92vw)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Keyboard Shortcuts</h2>
                <button type="button" onClick={() => setShortcutsOpen(false)}>
                  Close
                </button>
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
                <div><b>D</b> — Draw 2</div>
                <div><b>E</b> — End Play</div>
                <div><b>A</b> — Advance Turn</div>
                <div><b>U</b> — Undo</div>
                <div><b>L</b> — Toggle Log</div>
                <div><b>?</b> or <b>Shift + /</b> — Open Tutorial</div>
                <div><b>Esc</b> — Clear Selection</div>
              </div>
            </div>
          </div>
        )}

        {showHowTo && <HowToOverlay onClose={() => setShowHowTo(false)} />}
        <TutorialOverlay
          open={tutorialOpen}
          mode={tutorialMode}
          steps={TUTORIAL_STEPS}
          currentIndex={tutorialIndex}
          onPrev={() => setTutorialIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => setTutorialIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
          onClose={() => setTutorialOpen(false)}
          onSkip={() => {
            markSeenTutorial();
            setTutorialOpen(false);
          }}
          onDone={() => {
            markSeenTutorial();
            setTutorialOpen(false);
          }}
        />

        <div className="game-content">
          {isDev && showDeterminismTools && (
            <DeterminismPanel
              bundle={replayImportBundle ?? buildReplayBundle()}
              presentState={state}
              reducer={reducer}
              onReplaceState={handleDeterminismReplaceState}
            />
          )}

          {isDev && showInspector && (
            <div
              style={{
                padding: 10,
                border: "1px solid #666",
                borderRadius: 10,
                background: "#fafafa",
                color: "#1f1f1f",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: 0 }}>Game Inspector</h3>
                <div style={{ fontSize: 12, color: "#666" }}>Dev-only</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 8 }}>
                <div><b>Seed:</b> {state.seed}</div>
                <div><b>Phase:</b> {state.phase}</div>
                <div><b>Turn:</b> {state.turn}</div>
                <div><b>Active:</b> Player {state.active + 1}</div>
                <div><b>Plays Remaining:</b> {state.counters.playsRemaining}</div>
                <div><b>Impacts Remaining:</b> {state.counters.impactsRemaining}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>Last Action</div>
                <pre style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#1f1f1f" }}>
                  {lastAction ? JSON.stringify(lastAction, null, 2) : "None"}
                </pre>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>State JSON</div>
                <pre
                  style={{
                    marginTop: 6,
                    maxHeight: 200,
                    overflow: "auto",
                    background: "#fff",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    color: "#1f1f1f",
                  }}
                >
                  {JSON.stringify(state, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <CoreStatusStrip
            state={state}
            active={active}
            canWaterSwap={canWaterSwap}
            canGasRedraw={canGasRedraw}
            waterSwapPick={waterSwapPick}
            pulsePlayer={corePulse?.player}
            pulseKey={corePulse?.key}
            usedKeys={usedKeys}
          />
          <CoachStrip
            hints={coachHints}
            onAction={onCoachAction}
            isActionDisabled={(hint) => hint.actionLabel === "Draw" && !canDraw}
          />

          <div className="game-arena-row">
            <PlayerPanel
              title={`Player 1${active === 0 ? " (Active)" : ""}`}
              player={0}
              core={state.players[0].planet.core}
              planetSlots={state.players[0].planet.slots}
              planetViz={p0Viz}
              locked={state.players[0].planet.locked}
              terraformMin={3}
              progress={p0Progress}
              pulseTypes={progressPulse[0]?.types}
              onClickSlot={active === 0 ? onClickSlot : undefined}
              selected={active === 0 ? selected : { kind: "NONE" }}
              waterSwapPick={active === 0 ? waterSwapPick : null}
              waterSwapMode={active === 0 && canWaterSwap && selected.kind === "NONE"}
              flashSlots={active === 0 ? activeFlashSlots : otherFlashSlots}
              flashFx={active === 0 ? activeFlashFx : otherFlashFx}
              isActive={active === 0}
              isCpu={playVsComputer && 0 === aiConfig.player}
              showTurnControls={mode === "LOCAL_2P"}
              turnControls={{
                canDraw: canDraw && active === 0,
                canEndPlay: canEndPlay && active === 0,
                canAdvance: canAdvance && active === 0,
                canUndo: canUndo && active === 0,
                emphasizeEndPlay: endPlayReady && active === 0,
                emphasizeAdvance: advanceReady && active === 0,
                drawDisabledReason,
                endPlayDisabledReason,
                advanceDisabledReason,
                onDraw2: handleDraw2,
                onEndPlay: handleEndPlay,
                onAdvance: handleAdvance,
                onUndo: handleUndo,
              }}
              controlsId={active === 0 ? "ui-player-controls" : undefined}
              drawId={active === 0 ? "ui-btn-draw" : undefined}
              endPlayId={active === 0 ? "ui-btn-endplay" : undefined}
              advanceId={active === 0 ? "ui-btn-advance" : undefined}
              drawRef={active === 0 ? drawRef : undefined}
              endPlayRef={active === 0 ? endPlayRef : undefined}
              advanceRef={active === 0 ? advanceRef : undefined}
              undoRef={active === 0 ? undoRef : undefined}
            />
            <div id="ui-arena" style={{ display: "contents" }}>
              <ArenaView
                lastEvent={arenaEvent}
                bagCount={state.bag.length}
                discardCount={state.discard.length}
                activePlayer={active}
                p0Viz={p0Viz}
                p1Viz={p1Viz}
              />
            </div>
            <PlayerPanel
              title={`Player 2${playVsComputer ? " (CPU)" : ""}${active === 1 ? " (Active)" : ""}`}
              player={1}
              core={state.players[1].planet.core}
              planetSlots={state.players[1].planet.slots}
              planetViz={p1Viz}
              locked={state.players[1].planet.locked}
              terraformMin={3}
              progress={p1Progress}
              pulseTypes={progressPulse[1]?.types}
              onClickSlot={active === 1 ? onClickSlot : undefined}
              selected={active === 1 ? selected : { kind: "NONE" }}
              waterSwapPick={active === 1 ? waterSwapPick : null}
              waterSwapMode={active === 1 && canWaterSwap && selected.kind === "NONE"}
              flashSlots={active === 1 ? activeFlashSlots : otherFlashSlots}
              flashFx={active === 1 ? activeFlashFx : otherFlashFx}
              isActive={active === 1}
              isCpu={playVsComputer && 1 === aiConfig.player}
              showTurnControls={mode === "LOCAL_2P"}
              turnControls={{
                canDraw: canDraw && active === 1,
                canEndPlay: canEndPlay && active === 1,
                canAdvance: canAdvance && active === 1,
                canUndo: canUndo && active === 1,
                emphasizeEndPlay: endPlayReady && active === 1,
                emphasizeAdvance: advanceReady && active === 1,
                drawDisabledReason,
                endPlayDisabledReason,
                advanceDisabledReason,
                onDraw2: handleDraw2,
                onEndPlay: handleEndPlay,
                onAdvance: handleAdvance,
                onUndo: handleUndo,
              }}
              controlsId={active === 1 ? "ui-player-controls" : undefined}
              drawId={active === 1 ? "ui-btn-draw" : undefined}
              endPlayId={active === 1 ? "ui-btn-endplay" : undefined}
              advanceId={active === 1 ? "ui-btn-advance" : undefined}
              drawRef={active === 1 ? drawRef : undefined}
              endPlayRef={active === 1 ? endPlayRef : undefined}
              advanceRef={active === 1 ? advanceRef : undefined}
              undoRef={active === 1 ? undoRef : undefined}
            />
          </div>

        <div className="game-bottom-row">
            <div className={`hand-panel hand-panel--active${isLastPlay ? " hand-last-play" : ""}`} id="ui-hand-panel">
              <div className="hand-panel__header">
                <h3 className="hand-panel__title">Hand (Player {active + 1})</h3>
                {playVsComputer && active === 1 && !aiPaused && <div style={{ fontSize: 12, color: "#9cc1ff" }}>Computer thinking…</div>}
                <div className="hand-panel__hint">
                  Click Terraform/Colonize then a slot. Select an Impact to choose its target.
                  {canGasRedraw && <span> (Tip: <b>Shift-click</b> to Gas Redraw)</span>}
                </div>
              </div>

              {showDiscard && (
                <div style={{ marginTop: 6, padding: 6, borderRadius: 8, background: "rgba(150, 80, 80, 0.2)" }}>
                  <b>Hand overflow.</b> Discard until you have 3 or fewer.
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {activeHand.map((o, i) => (
                      <button key={i} onClick={() => onDiscardIndex(i)}>
                        Discard #{i + 1}: {orbLabel(o)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="hand-scroll">
                {activeHand.length === 0 && <div style={{ color: "#777" }}>No orbs in hand.</div>}
                {activeHand.map((o, i) => {
                  const isSel = selected.kind === "HAND" && selected.handIndex === i;
                  const isImpact = o.kind === "IMPACT";
                  const disabledReason = getOrbDisabledReason(
                    state,
                    o,
                    active,
                    state.phase,
                    playsRemaining,
                    impactsRemaining,
                    (p: 0 | 1) => abilitiesEnabled(state, p),
                  );
                  const isDisabled = disabledReason !== null;
                  const handTokenClass = `hand-token${isDisabled ? " orb-disabled" : ""}`;

                  const orbToken = (
                    <OrbToken
                      orb={o}
                      size="md"
                      selected={isSel}
                      disabled={isDisabled}
                      disabledReason={disabledReason ?? undefined}
                      actionable={isImpact && canPlayImpact && !isDisabled}
                      title={disabledReason ?? orbTooltip(o)}
                      onClick={isDisabled ? undefined : (e) => onClickHand(i, e)}
                    />
                  );

                  return (
                    <div
                      key={i}
                      className={handTokenClass}
                      onMouseEnter={() => {
                        if (isImpact && !isDisabled) setHoveredImpactIndex(i);
                      }}
                      onMouseLeave={() => {
                        if (isImpact && !isDisabled) setHoveredImpactIndex((prev) => (prev === i ? null : prev));
                      }}
                    >
                      {disabledReason ? (
                        <Tooltip content={disabledReason}>{orbToken}</Tooltip>
                      ) : (
                        orbToken
                      )}
                      <div className="orb-label">{orbShort(o)}</div>
                      {isImpact && !isDisabled && <div style={{ fontSize: 10, color: "#cfd5ff" }}>Select target</div>}
                    </div>
                  );
                })}
              </div>

              {selected.kind === "HAND" && selected.orb.kind !== "IMPACT" && (
                <div style={{ marginTop: 8, color: "#ddd", fontSize: 12 }}>
                  Selected: <b>{orbLabel(selected.orb)}</b> → click an empty slot on the active planet.
                  <button style={{ marginLeft: 8 }} onClick={clearSelection}>Clear</button>
                </div>
              )}
              {selected.kind === "HAND" && selected.orb.kind === "IMPACT" && (
                <div style={{ marginTop: 8, padding: 8, border: "1px solid #2a2f44", borderRadius: 10, background: "rgba(10,14,24,0.75)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>Impact Targeting</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 12 }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name="impact-target"
                        value="OPPONENT"
                        checked={impactTarget === "OPPONENT"}
                        onChange={() => setImpactTarget("OPPONENT")}
                      />
                      Opponent
                    </label>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name="impact-target"
                        value="SELF"
                        checked={impactTarget === "SELF"}
                        onChange={() => setImpactTarget("SELF")}
                      />
                      Self
                    </label>
                    <button onClick={onPlaySelectedImpact} disabled={!canPlayImpact}>
                      Fire Impact
                    </button>
                    <button onClick={clearSelection}>Clear</button>
                  </div>
                </div>
              )}
            </div>

            {impactPreview && (
              <div className="impact-panel">
                <ImpactPreviewPanel preview={impactPreview} />
              </div>
            )}
          </div>
        </div>

        {logOpen && (
          <div className="log-drawer" role="region" aria-label="Action log">
            <div className="log-drawer__header">
              <span>Action Log</span>
              <button onClick={() => setLogOpen(false)}>
                Collapse
              </button>
            </div>
            <div className="log-drawer__body">
              {logLines.length === 0 && <div className="log-drawer__line">No log entries yet.</div>}
              {logLines.map((line, idx) => (
                <div key={idx} className="log-drawer__line">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameErrorBoundary>
  );
}


function CoreStatusStrip({
  state,
  active,
  canWaterSwap,
  canGasRedraw,
  waterSwapPick,
  pulsePlayer,
  pulseKey,
  usedKeys,
}: {
  state: GameState;
  active: 0 | 1;
  canWaterSwap: boolean;
  canGasRedraw: boolean;
  waterSwapPick: number | null;
  pulsePlayer?: 0 | 1;
  pulseKey?: string;
  usedKeys: { 0: string[]; 1: string[] };
}) {
  const p0 = state.players[0];
  const p1 = state.players[1];
  const showFirstTurnHint = state.turn === 1 && state.phase !== "GAME_OVER";
  const activeCore = state.players[active].planet.core;

  return (
    <div className="coach-strip" id="ui-core-status">
      <div className="coach-grid">
        <CoreStatusCard who="Player 1" state={state} p={0} pulseKey={pulseKey} pulsePlayer={pulsePlayer} usedKeys={usedKeys} />
        <CoreStatusCard who="Player 2" state={state} p={1} pulseKey={pulseKey} pulsePlayer={pulsePlayer} usedKeys={usedKeys} />
      </div>
      <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
        {showFirstTurnHint && (
          <div>
            <b>Recommended first turn:</b> {getFirstTurnHint(activeCore)}
          </div>
        )}
        {(canWaterSwap || canGasRedraw) && (
          <div>
            <b>Core actions:</b>{" "}
            {canWaterSwap && (
              <span>
                Water Swap ready — click two Terraform slots
                {waterSwapPick !== null ? ` (first: ${waterSwapPick})` : ""}.
              </span>
            )}
            {canGasRedraw && <span> Gas Redraw ready — Shift-click a hand orb.</span>}
          </div>
        )}
        <div>
          <b>Player 1</b> Terraform {terraformCount(p0.planet.slots)}/6 • Colonize types {colonizeTypesCount(p0.planet.slots)}/4
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <b>Player 2</b> Terraform {terraformCount(p1.planet.slots)}/6 • Colonize types {colonizeTypesCount(p1.planet.slots)}/4
        </div>
      </div>
    </div>
  );
}

function CoreStatusCard({
  who,
  state,
  p,
  pulseKey,
  pulsePlayer,
  usedKeys,
}: {
  who: string;
  state: GameState;
  p: 0 | 1;
  pulseKey?: string;
  pulsePlayer?: 0 | 1;
  usedKeys: { 0: string[]; 1: string[] };
}) {
  const ps = state.players[p];
  const enabled = abilitiesEnabled(state, p);
  const used = new Set(usedKeys[p]);

  const items: Array<{ label: string; value: string; tooltip?: string; key?: string; used?: boolean }> = [
    { label: "Core", value: ps.planet.core, tooltip: corePassiveTooltip(ps.planet.core) },
    { label: "Abilities", value: enabled ? "Enabled" : `Disabled (until turn ${ps.abilities.disabled_until_turn})` },
    {
      label: "Land free Terraform",
      value: ps.planet.core === "LAND" ? (ps.abilities.land_free_terraform_used_turn ? "Used" : "Ready") : "—",
      tooltip: getCoreInfo("LAND").passive,
      key: "LAND_FREE_TERRAFORM_USED",
      used: used.has("LAND_FREE_TERRAFORM_USED"),
    },
    {
      label: "Water Swap",
      value: ps.planet.core === "WATER" ? (ps.abilities.water_swap_used_turn ? "Used" : "Ready") : "—",
      tooltip: getCoreInfo("WATER").passive,
      key: "WATER_SWAP_USED",
      used: used.has("WATER_SWAP_USED"),
    },
    {
      label: "Ice Shield",
      value: ps.planet.core === "ICE" ? (ps.abilities.ice_shield_used_turn ? "Used" : "Ready") : "—",
      tooltip: getCoreInfo("ICE").passive,
      key: "ICE_SHIELD_USED",
      used: used.has("ICE_SHIELD_USED"),
    },
    {
      label: "Gas Redraw",
      value: ps.planet.core === "GAS" ? (ps.abilities.gas_redraw_used_turn ? "Used" : "Ready") : "—",
      tooltip: getCoreInfo("GAS").passive,
      key: "GAS_REDRAW_USED",
      used: used.has("GAS_REDRAW_USED"),
    },
    {
      label: "Plant Mitigation",
      value: ps.abilities.plant_block_used_round ? "Used" : "Ready (if you have Plant)",
      tooltip: getColonizeInfoText("PLANT"),
      key: "PLANT_MITIGATION_USED",
      used: used.has("PLANT_MITIGATION_USED"),
    },
    {
      label: "High-Tech Redirect",
      value: ps.abilities.hightech_redirect_used ? "Used" : "Ready (if you have High-Tech)",
      tooltip: getColonizeInfoText("HIGH_TECH"),
      key: "HIGHTECH_REDIRECT_USED",
      used: used.has("HIGHTECH_REDIRECT_USED"),
    },
  ];

  return (
    <div className="coach-card">
      <div style={{ fontWeight: 800 }}>{who}</div>
      {items.map((it) => (
        <div className="coach-row" key={it.label}>
          <div style={{ color: "rgba(237,239,246,0.7)" }}>{it.label}</div>
          <div
            className={`core-status__value${it.used ? " core-status__value--used" : ""}${pulsePlayer === p && it.key === pulseKey ? " core-status__value--pulse" : ""}`}
            style={{ fontWeight: 700 }}
            title={it.tooltip}
          >
            {it.value}
            {it.used && <span className="core-status__check" aria-hidden>✓</span>}
          </div>
        </div>
      ))}
    </div>
  );
}


function PlayerPanel(props: {
  id?: string;
  title: string;
  player: 0 | 1;
  core: Core;
  planetSlots: (Orb | null)[];
  planetViz: PlanetViz;
  locked: boolean[];
  terraformMin: number;
  progress: ProgressState;
  pulseTypes?: ColonizeType[];
  onClickSlot?: (i: number) => void;
  selected: Selected;
  waterSwapMode: boolean;
  waterSwapPick: number | null;
  flashSlots: number[];
  flashFx?: Impact | null;
  isActive?: boolean;
  showTurnControls?: boolean;
  turnControls?: {
    canDraw: boolean;
    canEndPlay: boolean;
    canAdvance: boolean;
    canUndo: boolean;
    emphasizeEndPlay?: boolean;
    emphasizeAdvance?: boolean;
    drawDisabledReason?: string | null;
    endPlayDisabledReason?: string | null;
    advanceDisabledReason?: string | null;
    onDraw2: () => void;
    onEndPlay: () => void;
    onAdvance: () => void;
    onUndo: () => void;
  };
  controlsId?: string;
  drawId?: string;
  endPlayId?: string;
  advanceId?: string;
  drawRef?: React.Ref<HTMLButtonElement>;
  endPlayRef?: React.Ref<HTMLButtonElement>;
  advanceRef?: React.Ref<HTMLButtonElement>;
  undoRef?: React.Ref<HTMLButtonElement>;
  isCpu?: boolean;
}) {
  const tCount = terraformCount(props.planetSlots);
  const cTypes = colonizeTypesCount(props.planetSlots);
  const ok = tCount >= props.terraformMin;

  return (
    <div className={`player-panel ${props.isActive ? "player-panel--active" : "player-panel--inactive"}`}>
      <div className="player-panel__header">
        <div className="player-panel__title">
          <PlanetIcon viz={props.planetViz} size={40} label={`${props.title} planet`} />
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {props.title}
              {props.isCpu && (
                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 999, background: "#3c4f70" }}>CPU</span>
              )}
            </h3>
            <div style={{ color: "rgba(237,239,246,0.7)", marginTop: 2 }}>
              Core: <CoreBadge core={props.core} />
            </div>
          </div>
        </div>
        <div className="player-panel__stats">
          <div><b>Terraform:</b> {tCount}/6 {ok ? "OK" : "LOW"}</div>
          <div><b>Colonize types:</b> {cTypes}/4</div>
          <div className="player-panel__progress">
            <ProgressTrack
              player={props.player}
              progress={props.progress}
              pulseTypes={props.pulseTypes}
              size="sm"
              title="Life"
            />
          </div>
        </div>
      </div>

      {props.showTurnControls && props.turnControls && (
        <div className="player-panel__controls" id={props.controlsId}>
          <Tooltip
            content={props.turnControls.drawDisabledReason ?? ""}
            disabled={!props.turnControls.drawDisabledReason}
          >
            <button
              id={props.drawId}
              ref={props.drawRef}
              disabled={!props.turnControls.canDraw}
              aria-disabled={!props.turnControls.canDraw || undefined}
              title={props.turnControls.drawDisabledReason ?? undefined}
              onClick={props.turnControls.onDraw2}
            >
              Draw
            </button>
          </Tooltip>
          <Tooltip
            content={props.turnControls.endPlayDisabledReason ?? ""}
            disabled={!props.turnControls.endPlayDisabledReason}
          >
            <button
              id={props.endPlayId}
              ref={props.endPlayRef}
              disabled={!props.turnControls.canEndPlay}
              aria-disabled={!props.turnControls.canEndPlay || undefined}
              className={props.turnControls.emphasizeEndPlay ? "btn-nudge" : undefined}
              title={props.turnControls.endPlayDisabledReason ?? undefined}
              onClick={props.turnControls.onEndPlay}
            >
              End Play
            </button>
          </Tooltip>
          {props.turnControls.emphasizeEndPlay && (
            <div className="turn-nudge-text">Ready to End Play</div>
          )}
          <Tooltip
            content={props.turnControls.advanceDisabledReason ?? ""}
            disabled={!props.turnControls.advanceDisabledReason}
          >
            <button
              id={props.advanceId}
              ref={props.advanceRef}
              disabled={!props.turnControls.canAdvance}
              aria-disabled={!props.turnControls.canAdvance || undefined}
              className={props.turnControls.emphasizeAdvance ? "btn-nudge btn-nudge-advance" : undefined}
              title={props.turnControls.advanceDisabledReason ?? undefined}
              onClick={props.turnControls.onAdvance}
            >
              Advance
            </button>
          </Tooltip>
          {props.turnControls.emphasizeAdvance && (
            <div className="turn-nudge-text turn-nudge-text--advance">Ready to Advance</div>
          )}
          <button
            ref={props.undoRef}
            disabled={!props.turnControls.canUndo}
            onClick={props.turnControls.onUndo}
          >
            Undo
          </button>
        </div>
      )}

      <div className="player-panel__slots">
        {props.planetSlots.map((s, i) => {
          const locked = props.locked[i];
          const clickable = !!props.onClickSlot;
          const showHint = clickable && props.selected.kind === "HAND" && props.selected.orb.kind !== "IMPACT";
          const waterPick = props.waterSwapMode && props.waterSwapPick === i;
          const flashSlot = props.flashSlots.includes(i);
          const fxStyle = flashSlot && props.flashFx ? fxForImpact(props.flashFx) : null;
          const slotFxClass = fxStyle ? fxStyle.slotClass : "fx-slot-generic";
          const slotClass = `${flashSlot ? "slot-flash " : ""}player-panel__slot-btn`;

          return (
            <button
              key={i}
              className={slotClass}
              onClick={() => props.onClickSlot?.(i)}
              disabled={!clickable}
              style={{
                border: waterPick ? "2px solid rgba(140,170,255,0.6)" : "1px solid rgba(255,255,255,0.18)",
                textAlign: "center",
                cursor: clickable ? "pointer" : "default",
                opacity: clickable ? 1 : 0.92,
                background: "rgba(10,14,24,0.5)",
                color: "#EDEFF6",
              }}
              title={
                s
                  ? orbTooltip(s)
                  : locked
                    ? "Locked slot"
                    : props.waterSwapMode
                      ? "Water Swap: click terraform slots"
                      : "Planet slot"
              }
            >
              {flashSlot && (
                <span
                  className={`fx-slot-overlay ${slotFxClass}`}
                  style={fxStyle ? ({ ["--fx-accent" as string]: fxStyle.accent } as React.CSSProperties) : undefined}
                  aria-hidden
                />
              )}
              <div className="player-panel__slot-content" style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                {s ? (
                  <OrbToken orb={s} size="slot" selected={waterPick} disabled={locked} title={orbTooltip(s)} />
                ) : (
                  <span className="slot-empty" />
                )}
                <div style={{ fontSize: 11, color: "rgba(237,239,246,0.7)" }}>
                  Slot {i + 1}{locked ? " • Locked" : ""}
                </div>
                {showHint && !s && !locked && <div className="slot-hint">Place here</div>}
                {props.waterSwapMode && s?.kind === "TERRAFORM" && !locked && (
                  <div className="slot-hint">Swap</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HowToOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>How to Play</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <h3>Objective</h3>
          <p>
            Build your planet by placing Terraform orbs, then Colonize with four different types to win.
            Impacts can destabilize your opponent or protect yourself.
          </p>

          <h3>Turn Flow</h3>
          <ul>
            <li>Draw cards.</li>
            <li>Play up to 2 orbs (Terraform/Colonize) and up to 1 Impact.</li>
            <li>End Play, then Advance to resolve impacts and check for victory.</li>
          </ul>

          <h3>Orb Types (hover for tooltips)</h3>
          <ul>
            <li><b>Terraform:</b> builds your planet. You need at least 3 Terraform on a planet before Colonizing.</li>
            <li><b>Colonize:</b> place on Terraform slots. Collect 4 different types to win.</li>
            <li><b>Impact:</b> attack or disrupt. Target yourself or your opponent.</li>
          </ul>

          <h3>Core Passives</h3>
          <ul>
            <li><b>Land:</b> first Terraform each turn is free.</li>
            <li><b>Water:</b> swap two Terraform orbs once per turn.</li>
            <li><b>Ice:</b> first impact against you each turn is reduced by 1 severity.</li>
            <li><b>Lava:</b> your impacts gain +1 severity.</li>
            <li><b>Gas:</b> Shift-click a hand orb to discard+draw once per turn.</li>
          </ul>

          <h3>Recommended First Turn</h3>
          <ul>
            <li><b>Land:</b> lean into the free Terraform for quick setup.</li>
            <li><b>Water:</b> build Terraform, then align with Water Swap.</li>
            <li><b>Ice:</b> Terraform while your shield is ready.</li>
            <li><b>Lava:</b> consider early pressure with an Impact.</li>
            <li><b>Gas:</b> use your redraw to fish for key orbs.</li>
          </ul>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={openRulebook}
              style={{ background: "none", border: "none", padding: 0, color: "#1f5fbf", cursor: "pointer" }}
            >
              Read the full rulebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoreTooltip({ title, core }: { title: string; core: Core }) {
  const info = getCoreInfo(core);
  return (
    <div style={{ marginTop: 10, padding: 10, border: "1px solid #ddd", borderRadius: 12 }}>
      <div style={{ fontWeight: 800 }}>{title} — {core}</div>
      <div style={{ marginTop: 6 }}><b>Passive:</b> {info.passive}</div>
      <div style={{ marginTop: 6 }}><b>Weakness:</b> {info.weakness}</div>
      <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}><b>Style:</b> {info.style}</div>
    </div>
  );
}

function getCoreInfo(core: Core) {
  switch (core) {
    case "LAND":
      return { passive: "First Terraform each turn is free (does not consume a play).", weakness: "Terraform-destroying impacts remove +1 extra Terraform.", style: "Stable builder." };
    case "WATER":
      return { passive: "Once per turn, swap two Terraform orbs on your planet.", weakness: "Disease impacts have +1 severity.", style: "Adaptive control." };
    case "ICE":
      return { passive: "First impact against you each turn has -1 severity (min 1).", weakness: "On an Ice-core planet, placing Lava melts one Ice terraform.", style: "Defensive fortress." };
    case "LAVA":
      return { passive: "Your impacts have +1 severity (if abilities enabled).", weakness: "When unstable, you take 2 instability strikes instead of 1.", style: "Aggressive pressure." };
    case "GAS":
      return { passive: "Once per turn, Shift-click a hand orb to discard+draw.", weakness: "Cannot place Ice terraform.", style: "Wildcard hand control." };
  }
}

class GameErrorBoundary extends React.Component<
  { onReset: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Game screen crashed.", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div style={{ padding: 20, maxWidth: 720, margin: "40px auto", textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Game UI failed to render</h2>
        <p style={{ color: "rgba(237, 239, 246, 0.8)" }}>
          Something went wrong while loading the match view. You can return to setup and try again.
        </p>
        <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", background: "rgba(10,14,24,0.6)", padding: 12, borderRadius: 10 }}>
          {this.state.error.message}
        </pre>
        <button onClick={this.props.onReset} style={{ marginTop: 12, padding: "8px 14px", borderRadius: 10 }}>
          Back to Setup
        </button>
      </div>
    );
  }
}
