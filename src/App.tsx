import React, { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "./assets/logo.png";
import type { Action, Core, GameState, Impact, Mode, Orb } from "./engine/types";
import { reducer } from "./engine/reducer";
import { newGame } from "./engine/setup";
import { CoreBadge } from "./ui/components/CoreBadge";
import { OrbToken } from "./ui/components/OrbToken";
import { ArenaView } from "./ui/components/ArenaView";
import { ImpactPreviewPanel } from "./ui/components/ImpactPreviewPanel";
import { beginPendingImpactDiff, resolvePendingDiff } from "./ui/utils/pendingDiff";
import type { PendingDiff } from "./ui/utils/pendingDiff";
import { computeImpactPreview } from "./ui/utils/impactPreview";
import type { ImpactPreview } from "./ui/utils/impactPreview";
import { pushHistory, undo } from "./ui/utils/history";
import type { HistoryState } from "./ui/utils/history";

type Screen = "SPLASH" | "TITLE" | "SETUP" | "GAME";
type Selected = { kind: "NONE" } | { kind: "HAND"; handIndex: number; orb: Orb };
type ImpactTargetChoice = "OPPONENT" | "SELF";
export type UIEvent =
  | { kind: "IMPACT_CAST"; at: number; impact: string; source: 0 | 1; target: 0 | 1 }
  | { kind: "IMPACT_RESOLVED"; at: number; impact: string; source: 0 | 1; target: 0 | 1; affectedSlots: number[] }
  | { kind: "DRAW"; at: number; player: 0 | 1 }
  | { kind: "PLACE"; at: number; player: 0 | 1; slotIndex: number };

const CORES: Core[] = ["LAND", "WATER", "ICE", "LAVA", "GAS"];
const HISTORY_LIMIT = 30;
const RULEBOOK_URL = "/RULEBOOK.md";

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
function hasPlant(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "PLANT");
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
  const [selected, setSelected] = useState<Selected>({ kind: "NONE" });
  const [hoveredImpactIndex, setHoveredImpactIndex] = useState<number | null>(null);
  const [seedInput, setSeedInput] = useState<string>(() => String(initialSeed));
  const [showInspector, setShowInspector] = useState(false);
  const [impactTarget, setImpactTarget] = useState<ImpactTargetChoice>("OPPONENT");
  const [showHowTo, setShowHowTo] = useState(false);
  const [uiEvents, setUiEvents] = useState<UIEvent[]>([]);
  const [arenaEvent, setArenaEvent] = useState<UIEvent | null>(null);
  const [flashState, setFlashState] = useState<{ target: 0 | 1; slots: number[]; until: number } | null>(null);
  const pendingDiffRef = useRef<PendingDiff>(null);

  // Water swap (two-click) selection; only active if selected.kind === NONE
  const [waterSwapPick, setWaterSwapPick] = useState<number | null>(null);
  const isDev = import.meta.env.DEV;

  const containerStyle: React.CSSProperties = {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    maxWidth: 1100,
    margin: "0 auto",
  };

  useEffect(() => {
    if (!flashState) return;
    const ms = Math.max(0, flashState.until - Date.now());
    const timer = window.setTimeout(() => setFlashState(null), ms);
    return () => window.clearTimeout(timer);
  }, [flashState]);

  function pushUiEvent(event: UIEvent) {
    setUiEvents((prev) => [...prev.slice(-24), event]);
    setArenaEvent(event);
  }

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
    });

    pendingDiffRef.current = null;
  }, [state]);

  function resolveSeed() {
    const trimmed = seedInput.trim();
    if (!trimmed) return Date.now();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function dispatchWithLog(action: Action) {
    setLastAction(action);
    setHistory((prev) => {
      const nextPresent = reducer(prev.present, action);
      if (nextPresent === prev.present) return prev;
      if (action.type === "NEW_GAME") {
        return { past: [], present: nextPresent, future: [] };
      }
      if (!shouldRecordHistory(action)) {
        return { ...prev, present: nextPresent, future: [] };
      }
      return pushHistory(prev, nextPresent, HISTORY_LIMIT);
    });
  }

  function startGame() {
    resetTransientUi();
    const seed = resolveSeed();
    setSeedInput(String(seed));
    dispatchWithLog({ type: "NEW_GAME", mode, coreP0: p0Core, coreP1: p1Core, seed });
    setScreen("GAME");
  }


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
              onClick={() => setScreen("TITLE")}
              style={{ padding: "10px 14px", borderRadius: 10 }}
            >
              Enter
            </button>
            <button
              onClick={() => setScreen("SETUP")}
              style={{ padding: "10px 14px", borderRadius: 10 }}
              title="Skip to setup"
            >
              Quick Start
            </button>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>
            Click Enter to continue
          </div>
        </div>
      </div>
    );
  }

  if (screen === "TITLE") {
    return (
      <div style={containerStyle}>
        <div style={{ border: "1px solid #bbb", borderRadius: 14, padding: 18 }}>
          <h1 style={{ margin: 0 }}>PRIMORDIAL ORBS</h1>
          <div style={{ marginTop: 6, color: "#555" }}>Terraform • Evolve • Destabilize</div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <button onClick={() => setScreen("SETUP")} style={{ padding: "10px 14px", borderRadius: 10 }}>
              Local 2P
            </button>
            <button onClick={() => setShowHowTo(true)} style={{ padding: "10px 14px", borderRadius: 10 }}>
              How to Play
            </button>
          </div>

          <div style={{ marginTop: 16, color: "#666", fontSize: 13 }}>
            MVP defaults: Medium planet (6 slots) • Terraform min 3 • Draw 2 • Hand cap 3 • Play 2 • Impact 1
          </div>
        </div>
        {showHowTo && <HowToOverlay onClose={() => setShowHowTo(false)} />}
      </div>
    );
  }

  if (screen === "SETUP") {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Setup</h2>
          <button onClick={() => setScreen("TITLE")}>Back</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div style={{ border: "1px solid #bbb", borderRadius: 14, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Choose Cores</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Player 0 Core</div>
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
                <CoreTooltip title="P0" core={p0Core} />
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Player 1 Core</div>
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
                <CoreTooltip title="P1" core={p1Core} />
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #bbb", borderRadius: 14, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Match Settings</h3>
            <div style={{ marginTop: 6 }}>
              <div><b>Mode:</b> Local 2P</div>
              <div style={{ marginTop: 6 }}><b>Planet Size:</b> Medium (fixed)</div>
              <div style={{ marginTop: 6 }}><b>Win:</b> 4 Colonization types</div>
              <div style={{ marginTop: 6 }}><b>Turn:</b> Draw 2 • Hand cap 3 • Play 2 • Impact 1</div>
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
              <a href={RULEBOOK_URL} target="_blank" rel="noreferrer">
                Read the full rulebook
              </a>
            </div>
          </div>
        </div>
        {showHowTo && <HowToOverlay onClose={() => setShowHowTo(false)} />}
      </div>
    );
  }

  // GAME screen
  const active = state.active;
  const other: 0 | 1 = active === 0 ? 1 : 0;

  const activeHand = state.players[active].hand;
  const activePlanet = state.players[active].planet;
  const otherPlanet = state.players[other].planet;

  const playsRemaining = state.counters.playsRemaining;
  const impactsRemaining = state.counters.impactsRemaining;

  const canDraw = state.phase === "DRAW";
  const canEndPlay = state.phase === "PLAY";
  const canAdvance = state.phase === "RESOLVE" || state.phase === "CHECK_WIN";
  const canPlayImpact = state.phase === "PLAY" && playsRemaining > 0 && impactsRemaining > 0;
  const showDiscard = state.phase === "DRAW" && isHandOverflow(state);
  const canUndo = mode === "LOCAL_2P" && history.past.length > 0 && state.phase !== "GAME_OVER";

  const canWaterSwap =
    state.phase === "PLAY" &&
    activePlanet.core === "WATER" &&
    !state.players[active].abilities.water_swap_used_turn &&
    abilitiesEnabled(state, active);

  const canGasRedraw =
    state.phase === "PLAY" &&
    activePlanet.core === "GAS" &&
    !state.players[active].abilities.gas_redraw_used_turn &&
    abilitiesEnabled(state, active);

  const impactPreview: ImpactPreview | null = useMemo(() => {
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
  }, [active, activeHand, hoveredImpactIndex, impactTarget, other, selected, state]);

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
    pendingDiffRef.current = null;
  }

  function onClickHand(i: number, e: React.MouseEvent) {
    const orb = activeHand[i];
    if (!orb) return;

    // GAS passive: Shift-click any hand orb to redraw it (once per turn)
    if (canGasRedraw && e.shiftKey) {
      dispatchWithLog({ type: "GAS_REDRAW", handIndex: i });
      clearSelection();
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
    if (state.phase !== "PLAY") return;

    // WATER passive: when nothing selected from hand, allow swap by clicking two terraform slots
    if (canWaterSwap && selected.kind === "NONE") {
      if (waterSwapPick === null) {
        setWaterSwapPick(slotIndex);
      } else {
        dispatchWithLog({ type: "WATER_SWAP", slotA: waterSwapPick, slotB: slotIndex });
        setWaterSwapPick(null);
      }
      return;
    }

    if (selected.kind !== "HAND") return;

    const { handIndex, orb } = selected;

    if (orb.kind === "TERRAFORM") {
      dispatchWithLog({ type: "PLAY_TERRAFORM", handIndex, slotIndex });
      pushUiEvent({ kind: "PLACE", at: Date.now(), player: active, slotIndex });
      clearSelection();
      return;
    }
    if (orb.kind === "COLONIZE") {
      dispatchWithLog({ type: "PLAY_COLONIZE", handIndex, slotIndex });
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
    clearSelection();
  }

  const title =
    state.phase === "GAME_OVER"
      ? `Game Over — Winner: P${String(state.winner)}`
      : `Turn ${state.turn} • Phase: ${state.phase} • Active: P${active}`;

  const activeFlashSlots = flashState?.target === active ? flashState.slots : [];
  const otherFlashSlots = flashState?.target === other ? flashState.slots : [];

  return (
    <div style={containerStyle} className="app-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isDev && (
            <button onClick={() => setShowInspector((prev) => !prev)}>
              {showInspector ? "Hide" : "Show"} Game Inspector
            </button>
          )}
          <button onClick={() => setShowHowTo(true)}>How to Play</button>
          <button onClick={() => setScreen("SETUP")}>Setup</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            resetTransientUi();
            const seed = resolveSeed();
            setSeedInput(String(seed));
            dispatchWithLog({ type: "NEW_GAME", mode: "LOCAL_2P", coreP0: p0Core, coreP1: p1Core, seed });
          }}
        >
          New Game
        </button>

        {mode === "LOCAL_2P" && (
          <button
            disabled={!canUndo}
            onClick={() => {
              resetTransientUi();
              setLastAction(null);
              setHistory((prev) => undo(prev));
            }}
          >
            Undo
          </button>
        )}

        <button
          disabled={!canDraw}
          onClick={() => {
            clearSelection();
            dispatchWithLog({ type: "DRAW_2" });
            pushUiEvent({ kind: "DRAW", at: Date.now(), player: active });
          }}
        >
          Draw 2
        </button>

        <button disabled={!canEndPlay} onClick={() => { clearSelection(); dispatchWithLog({ type: "END_PLAY" }); }}>
          End Play
        </button>

        <button disabled={!canAdvance} onClick={() => { clearSelection(); dispatchWithLog({ type: "ADVANCE" }); }}>
          Advance
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div><b>Plays:</b> {playsRemaining}/2</div>
          <div><b>Impacts:</b> {impactsRemaining}/1</div>
          <div><b>Hand:</b> {activeHand.length}/3</div>
          <a href={RULEBOOK_URL} target="_blank" rel="noreferrer">
            Full rulebook
          </a>
          {state.players[active].abilities.disabled_until_turn !== undefined && !abilitiesEnabled(state, active) && (
            <div style={{ color: "#a00" }} title="Solar Flare">
              <b>Abilities Disabled</b>
            </div>
          )}
        </div>
      </div>
      {showHowTo && <HowToOverlay onClose={() => setShowHowTo(false)} />}

      {isDev && showInspector && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #666", borderRadius: 10, background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ margin: 0 }}>Game Inspector</h3>
            <div style={{ fontSize: 12, color: "#666" }}>Dev-only</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 10 }}>
            <div><b>Seed:</b> {state.seed}</div>
            <div><b>Phase:</b> {state.phase}</div>
            <div><b>Turn:</b> {state.turn}</div>
            <div><b>Active:</b> P{state.active}</div>
            <div><b>Plays Remaining:</b> {state.counters.playsRemaining}</div>
            <div><b>Impacts Remaining:</b> {state.counters.impactsRemaining}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>Last Action</div>
            <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
              {lastAction ? JSON.stringify(lastAction, null, 2) : "None"}
            </pre>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>State JSON</div>
            <pre style={{ marginTop: 6, maxHeight: 240, overflow: "auto", background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>
              {JSON.stringify(state, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {state.turn === 1 && state.phase !== "GAME_OVER" && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #c7d7ff", borderRadius: 10, background: "#f4f7ff" }}>
          <b>Recommended first turn:</b> {getFirstTurnHint(activePlanet.core)}
        </div>
      )}

      {showDiscard && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #999", borderRadius: 8 }}>
          <b>Hand overflow.</b> Discard until you have 3 or fewer.
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {activeHand.map((o, i) => (
                <button key={i} onClick={() => onDiscardIndex(i)}>
                Discard #{i + 1}: {orbLabel(o)}
                </button>
              ))}
          </div>
        </div>
      )}

      {(canWaterSwap || canGasRedraw) && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10, color: "#333" }}>
          <b>Core Actions:</b>
          <div style={{ marginTop: 6 }}>
            {canWaterSwap ? (
              <div>
                <b>Water Swap</b> (once/turn): With no hand selection, click two <b>Terraform</b> slots to swap.
                {waterSwapPick !== null && (
                  <span style={{ marginLeft: 10 }}>
                    Selected first slot: <b>{waterSwapPick}</b>
                  </span>
                )}
              </div>
            ) : (
              <div style={{ color: "#777" }}>Water Swap: unavailable</div>
            )}
          </div>
          <div style={{ marginTop: 6 }}>
            {canGasRedraw ? (
              <div>
                <b>Gas Redraw</b> (once/turn): <b>Shift-click</b> a hand orb to discard+draw.
              </div>
            ) : (
              <div style={{ color: "#777" }}>Gas Redraw: unavailable</div>
            )}
          </div>
        </div>
      )}


      <CoreStatusStrip state={state} />

      <div className="game-arena-row" style={{ marginTop: 16 }}>
        <PlayerPanel
          title={`Player ${active} (Active)`}
          core={activePlanet.core}
          planetSlots={activePlanet.slots}
          locked={activePlanet.locked}
          terraformMin={3}
          onClickSlot={onClickSlot}
          selected={selected}
          waterSwapPick={waterSwapPick}
          waterSwapMode={canWaterSwap && selected.kind === "NONE"}
          flashSlots={activeFlashSlots}
        />
        <ArenaView
          lastEvent={arenaEvent}
          bagCount={state.bag.length}
          discardCount={state.discard.length}
          activePlayer={active}
        />
        <PlayerPanel
          title={`Player ${other}`}
          core={otherPlanet.core}
          planetSlots={otherPlanet.slots}
          locked={otherPlanet.locked}
          terraformMin={3}
          selected={{ kind: "NONE" }}
          waterSwapPick={null}
          waterSwapMode={false}
          flashSlots={otherFlashSlots}
        />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ padding: 12, border: "1px solid #bbb", borderRadius: 10, flex: "1 1 360px", minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Hand (P{active})</h3>
            <div style={{ color: "#555" }}>
              Click Terraform/Colonize then click a slot. Select an Impact to choose its target.
              {canGasRedraw && <span> (Tip: <b>Shift-click</b> to Gas Redraw)</span>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {activeHand.length === 0 && <div style={{ color: "#777" }}>No orbs in hand.</div>}
            {activeHand.map((o, i) => {
              const isSel = selected.kind === "HAND" && selected.handIndex === i;
              const isImpact = o.kind === "IMPACT";
              return (
                <div
                  key={i}
                  style={{ display: "grid", justifyItems: "center", minWidth: 84 }}
                  onMouseEnter={() => {
                    if (isImpact) setHoveredImpactIndex(i);
                  }}
                  onMouseLeave={() => {
                    if (isImpact) setHoveredImpactIndex((prev) => (prev === i ? null : prev));
                  }}
                >
                  <OrbToken
                    orb={o}
                    size="lg"
                    selected={isSel}
                    actionable={isImpact && canPlayImpact}
                    title={orbTooltip(o)}
                    onClick={(e) => onClickHand(i, e)}
                  />
                  <div className="orb-label">{orbShort(o)}</div>
                  {isImpact && <div style={{ fontSize: 11, color: "#cfd5ff" }}>Select target</div>}
                </div>
              );
            })}
          </div>

          {selected.kind === "HAND" && selected.orb.kind !== "IMPACT" && (
            <div style={{ marginTop: 10, color: "#333" }}>
              Selected: <b>{orbLabel(selected.orb)}</b> → click an empty slot on the active planet.
              <button style={{ marginLeft: 10 }} onClick={clearSelection}>Clear</button>
            </div>
          )}
          {selected.kind === "HAND" && selected.orb.kind === "IMPACT" && (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10, background: "#fafafa" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Impact Targeting</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
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
          <div style={{ flex: "0 1 320px" }}>
            <ImpactPreviewPanel preview={impactPreview} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #bbb", borderRadius: 10 }}>
        <h3 style={{ margin: 0 }}>Action Log</h3>
        <div style={{ marginTop: 8, maxHeight: 240, overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
          {state.log.slice(0, 120).map((line, idx) => (
            <div key={idx} style={{ borderBottom: "1px dashed #eee", padding: "4px 0" }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, color: "#555", fontSize: 13 }}>
        <b>P0</b> Terraform {terraformCount(state.players[0].planet.slots)}/6 • Colonize types {colonizeTypesCount(state.players[0].planet.slots)}/4 &nbsp;&nbsp;|&nbsp;&nbsp;
        <b>P1</b> Terraform {terraformCount(state.players[1].planet.slots)}/6 • Colonize types {colonizeTypesCount(state.players[1].planet.slots)}/4
      </div>
    </div>
  );
}


function CoreStatusStrip({ state }: { state: GameState }) {
  const p0 = state.players[0];
  const p1 = state.players[1];

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 14,
  };

  return (
    <div style={{ marginTop: 14, padding: 12, border: "1px solid #bbb", borderRadius: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Core Status</div>
      <div style={rowStyle}>
        <CoreStatusCard who="P0" state={state} p={0} />
        <CoreStatusCard who="P1" state={state} p={1} />
      </div>
      <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
        Tips: Water Swap works when no hand orb is selected. Gas Redraw is Shift-click on a hand orb.
      </div>
    </div>
  );
}

function CoreStatusCard({ who, state, p }: { who: string; state: GameState; p: 0 | 1 }) {
  const ps = state.players[p];
  const enabled = abilitiesEnabled(state, p);

  const items: Array<{ label: string; value: string; tooltip?: string }> = [
    { label: "Core", value: ps.planet.core, tooltip: corePassiveTooltip(ps.planet.core) },
    { label: "Abilities", value: enabled ? "Enabled" : `Disabled (until turn ${ps.abilities.disabled_until_turn})` },
    { label: "Land free Terraform", value: ps.planet.core === "LAND" ? (ps.abilities.land_free_terraform_used_turn ? "Used" : "Ready") : "—", tooltip: getCoreInfo("LAND").passive },
    { label: "Water Swap", value: ps.planet.core === "WATER" ? (ps.abilities.water_swap_used_turn ? "Used" : "Ready") : "—", tooltip: getCoreInfo("WATER").passive },
    { label: "Ice Shield", value: ps.planet.core === "ICE" ? (ps.abilities.ice_shield_used_turn ? "Used" : "Ready") : "—", tooltip: getCoreInfo("ICE").passive },
    { label: "Gas Redraw", value: ps.planet.core === "GAS" ? (ps.abilities.gas_redraw_used_turn ? "Used" : "Ready") : "—", tooltip: getCoreInfo("GAS").passive },
    { label: "Plant Mitigation", value: ps.abilities.plant_block_used_round ? "Used" : "Ready (if you have Plant)", tooltip: getColonizeInfoText("PLANT") },
    { label: "High-Tech Redirect", value: ps.abilities.hightech_redirect_used ? "Used" : "Ready (if you have High-Tech)", tooltip: getColonizeInfoText("HIGH_TECH") },
  ];

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{who}</div>
      <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: 6, columnGap: 10 }}>
        {items.map((it) => (
          <React.Fragment key={it.label}>
            <div style={{ color: "#555" }}>{it.label}</div>
            <div style={{ fontWeight: 700 }} title={it.tooltip}>{it.value}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}


function PlayerPanel(props: {
  title: string;
  core: Core;
  planetSlots: (Orb | null)[];
  locked: boolean[];
  terraformMin: number;
  onClickSlot?: (i: number) => void;
  selected: Selected;
  waterSwapMode: boolean;
  waterSwapPick: number | null;
  flashSlots: number[];
}) {
  const tCount = terraformCount(props.planetSlots);
  const cTypes = colonizeTypesCount(props.planetSlots);
  const ok = tCount >= props.terraformMin;

  return (
    <div style={{ border: "1px solid #bbb", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{props.title}</h3>
          <div style={{ color: "#555", marginTop: 4 }}>
            Core: <CoreBadge core={props.core} />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div><b>Terraform:</b> {tCount}/6 {ok ? "OK" : "LOW"}</div>
          <div><b>Colonize types:</b> {cTypes}/4</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {props.planetSlots.map((s, i) => {
          const locked = props.locked[i];
          const clickable = !!props.onClickSlot;
          const showHint = clickable && props.selected.kind === "HAND" && props.selected.orb.kind !== "IMPACT";
          const waterPick = props.waterSwapMode && props.waterSwapPick === i;
          const flashSlot = props.flashSlots.includes(i);

          return (
            <button
              key={i}
              className={flashSlot ? "slot-flash" : undefined}
              onClick={() => props.onClickSlot?.(i)}
              disabled={!clickable}
              style={{
                padding: "12px 10px",
                borderRadius: 12,
                border: waterPick ? "2px solid rgba(140,170,255,0.6)" : "1px solid rgba(255,255,255,0.18)",
                minHeight: 86,
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
              <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
                {s ? (
                  <OrbToken orb={s} size="md" selected={waterPick} disabled={locked} title={orbTooltip(s)} />
                ) : (
                  <span className="slot-empty" />
                )}
                <div style={{ fontSize: 12, color: "rgba(237,239,246,0.7)" }}>
                  Slot {i}{locked ? " • Locked" : ""}
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
            <li>Draw 2 cards.</li>
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
            <a href={RULEBOOK_URL} target="_blank" rel="noreferrer">
              Read the full rulebook
            </a>
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
