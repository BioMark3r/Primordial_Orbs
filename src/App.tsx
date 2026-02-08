import React, { useMemo, useReducer, useState } from "react";
import logoUrl from "./assets/logo.png";
import type { Action, Core, GameState, Impact, Mode, Orb } from "./engine/types";
import { reducer } from "./engine/reducer";
import { newGame } from "./engine/setup";

type Screen = "SPLASH" | "TITLE" | "SETUP" | "GAME";
type Selected = { kind: "NONE" } | { kind: "HAND"; handIndex: number; orb: Orb };
type HistoryState = { past: GameState[]; present: GameState };
type AppAction = Action | { type: "UNDO" };
type ImpactTargetChoice = "OPPONENT" | "SELF";

const CORES: Core[] = ["LAND", "WATER", "ICE", "LAVA", "GAS"];
const HISTORY_LIMIT = 30;

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
function slotText(o: Orb | null): string {
  return o ? orbShort(o) : "—";
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
function hasColonize(state: GameState, p: 0 | 1): boolean {
  return state.players[p].planet.slots.some((s) => s?.kind === "COLONIZE");
}

function impactLikelyRemoves(impact: Impact, state: GameState, target: 0 | 1): string {
  switch (impact) {
    case "SOLAR_FLARE":
      return "None (disables abilities)";
    case "TEMPORAL_VORTEX":
      return "None (rewinds planet)";
    case "DISEASE":
      return "Colonize";
    case "BLACK_HOLE":
      return hasColonize(state, target) ? "Colonize" : "Terraform";
    case "METEOR":
    case "QUAKE":
    case "TORNADO":
      return "Terraform";
  }
}

function impactSeverityPreview(state: GameState, impact: Impact, source: 0 | 1, target: 0 | 1) {
  const sourcePlayer = state.players[source];
  const targetPlayer = state.players[target];
  const base = 1 + targetPlayer.vulnerability;
  let severity = base;

  const lavaBoost = sourcePlayer.planet.core === "LAVA" && abilitiesEnabled(state, source);
  const waterWeakness = impact === "DISEASE" && targetPlayer.planet.core === "WATER";
  const iceShield = targetPlayer.planet.core === "ICE" && abilitiesEnabled(state, target) && !targetPlayer.abilities.ice_shield_used_turn;
  const plantMitigation = abilitiesEnabled(state, target) && hasPlant(state, target) && !targetPlayer.abilities.plant_block_used_round;
  const landWeakness = targetPlayer.planet.core === "LAND";

  if (lavaBoost) severity += 1;
  if (waterWeakness) severity += 1;
  if (iceShield) severity = Math.max(1, severity - 1);
  if (plantMitigation) severity = Math.max(1, severity - 1);

  return {
    severity,
    base,
    lavaBoost,
    waterWeakness,
    iceShield,
    plantMitigation,
    landWeakness,
  };
}

export default function App() {
  const initialSeed = useMemo(() => Date.now(), []);
  const initial = useMemo(() => newGame("LOCAL_2P", "LAND", "ICE", initialSeed), [initialSeed]);
  const [history, dispatch] = useReducer((state: HistoryState, action: AppAction): HistoryState => {
    if (action.type === "UNDO") {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous };
    }
    const next = reducer(state.present, action);
    if (next === state.present) return state;
    if (action.type === "NEW_GAME") {
      return { past: [], present: next };
    }
    const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
    return { past, present: next };
  }, { past: [], present: initial });
  const state = history.present;
  const [lastAction, setLastAction] = useState<Action | null>(null);

  const [screen, setScreen] = useState<Screen>("SPLASH");
  const [mode] = useState<Mode>("LOCAL_2P"); // Local 2P wired
  const [p0Core, setP0Core] = useState<Core>("LAND");
  const [p1Core, setP1Core] = useState<Core>("ICE");
  const [selected, setSelected] = useState<Selected>({ kind: "NONE" });
  const [seedInput, setSeedInput] = useState<string>(() => String(initialSeed));
  const [showInspector, setShowInspector] = useState(false);
  const [impactTarget, setImpactTarget] = useState<ImpactTargetChoice>("OPPONENT");

  // Water swap (two-click) selection; only active if selected.kind === NONE
  const [waterSwapPick, setWaterSwapPick] = useState<number | null>(null);
  const isDev = import.meta.env.DEV;

  const containerStyle: React.CSSProperties = {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    maxWidth: 1100,
    margin: "0 auto",
  };

  function resolveSeed() {
    const trimmed = seedInput.trim();
    if (!trimmed) return Date.now();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function dispatchWithLog(action: AppAction) {
    if (action.type === "UNDO") {
      setLastAction(null);
    } else {
      setLastAction(action);
    }
    dispatch(action);
  }

  function startGame() {
    setSelected({ kind: "NONE" });
    setWaterSwapPick(null);
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
          </div>

          <div style={{ marginTop: 16, color: "#666", fontSize: 13 }}>
            MVP defaults: Medium planet (6 slots) • Terraform min 3 • Draw 2 • Hand cap 3 • Play 2 • Impact 1
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
            </div>
          </div>
        </div>
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
  const canUndo = mode === "LOCAL_2P" && history.past.length > 0;

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

  function clearSelection() {
    setSelected({ kind: "NONE" });
    setWaterSwapPick(null);
    setImpactTarget("OPPONENT");
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
      clearSelection();
      return;
    }
    if (orb.kind === "COLONIZE") {
      dispatchWithLog({ type: "PLAY_COLONIZE", handIndex, slotIndex });
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
    dispatchWithLog({ type: "PLAY_IMPACT", handIndex: selected.handIndex, target });
    clearSelection();
  }

  const title =
    state.phase === "GAME_OVER"
      ? `Game Over — Winner: P${String(state.winner)}`
      : `Turn ${state.turn} • Phase: ${state.phase} • Active: P${active}`;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isDev && (
            <button onClick={() => setShowInspector((prev) => !prev)}>
              {showInspector ? "Hide" : "Show"} Game Inspector
            </button>
          )}
          <button onClick={() => setScreen("SETUP")}>Setup</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            clearSelection();
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
              clearSelection();
              dispatchWithLog({ type: "UNDO" });
            }}
          >
            Undo
          </button>
        )}

        <button disabled={!canDraw} onClick={() => { clearSelection(); dispatchWithLog({ type: "DRAW_2" }); }}>
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
          {state.players[active].abilities.disabled_until_turn !== undefined && !abilitiesEnabled(state, active) && (
            <div style={{ color: "#a00" }} title="Solar Flare">
              <b>Abilities Disabled</b>
            </div>
          )}
        </div>
      </div>

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
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
        />
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #bbb", borderRadius: 10 }}>
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
              <button
                key={i}
                onClick={(e) => onClickHand(i, e)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: isSel ? "2px solid #222" : "1px solid #999",
                  cursor: "pointer",
                  minWidth: 150,
                  textAlign: "left",
                }}
                title={orbLabel(o)}
              >
                <div style={{ fontWeight: 700 }}>{orbShort(o)}</div>
                <div style={{ fontSize: 12, color: "#444" }}>{o.kind}</div>
                {isImpact && <div style={{ fontSize: 12, marginTop: 4 }}>Select target</div>}
              </button>
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
            {(() => {
              const target = impactTarget === "SELF" ? active : other;
              const preview = impactSeverityPreview(state, selected.orb.i, active, target);
              return (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Impact Preview</div>
                  <div>Severity will be <b>{preview.severity}</b> (base {preview.base}).</div>
                  <div style={{ marginTop: 4 }}>
                    Likely removes: <b>{impactLikelyRemoves(selected.orb.i, state, target)}</b>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#333" }}>
                    <div><b>Core Modifiers</b></div>
                    <div>Ice Shield: {preview.iceShield ? "−1 (ready)" : "—"}</div>
                    <div>Lava boost: {preview.lavaBoost ? "+1" : "—"}</div>
                    <div>Land weakness: {preview.landWeakness ? "+1 terraform removed" : "—"}</div>
                    <div>Plant mitigation: {preview.plantMitigation ? "−1 (ready)" : "—"}</div>
                    {preview.waterWeakness && <div>Water weakness: +1 (Disease)</div>}
                  </div>
                </div>
              );
            })()}
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

  const items: Array<{ label: string; value: string }> = [
    { label: "Core", value: ps.planet.core },
    { label: "Abilities", value: enabled ? "Enabled" : `Disabled (until turn ${ps.abilities.disabled_until_turn})` },
    { label: "Land free Terraform", value: ps.planet.core === "LAND" ? (ps.abilities.land_free_terraform_used_turn ? "Used" : "Ready") : "—" },
    { label: "Water Swap", value: ps.planet.core === "WATER" ? (ps.abilities.water_swap_used_turn ? "Used" : "Ready") : "—" },
    { label: "Ice Shield", value: ps.planet.core === "ICE" ? (ps.abilities.ice_shield_used_turn ? "Used" : "Ready") : "—" },
    { label: "Gas Redraw", value: ps.planet.core === "GAS" ? (ps.abilities.gas_redraw_used_turn ? "Used" : "Ready") : "—" },
    { label: "Plant Mitigation", value: ps.abilities.plant_block_used_round ? "Used" : "Ready (if you have Plant)" },
    { label: "High-Tech Redirect", value: ps.abilities.hightech_redirect_used ? "Used" : "Ready (if you have High-Tech)" },
  ];

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{who}</div>
      <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: 6, columnGap: 10 }}>
        {items.map((it) => (
          <React.Fragment key={it.label}>
            <div style={{ color: "#555" }}>{it.label}</div>
            <div style={{ fontWeight: 700 }}>{it.value}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}


function PlayerPanel(props: {
  title: string;
  core: any;
  planetSlots: (Orb | null)[];
  locked: boolean[];
  terraformMin: number;
  onClickSlot?: (i: number) => void;
  selected: Selected;
  waterSwapMode: boolean;
  waterSwapPick: number | null;
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
            Core: <b>{String(props.core)}</b>
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

          return (
            <button
              key={i}
              onClick={() => props.onClickSlot?.(i)}
              disabled={!clickable}
              style={{
                padding: "14px 10px",
                borderRadius: 12,
                border: waterPick ? "2px solid #005" : "1px solid #999",
                minHeight: 64,
                textAlign: "center",
                cursor: clickable ? "pointer" : "default",
                opacity: clickable ? 1 : 0.92,
              }}
              title={locked ? "Locked slot" : props.waterSwapMode ? "Water Swap: click terraform slots" : "Planet slot"}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{slotText(s)}</div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Slot {i}{locked ? " • Locked" : ""}
              </div>
              {showHint && !s && !locked && (
                <div style={{ fontSize: 11, marginTop: 6, color: "#333" }}>Place here</div>
              )}
              {props.waterSwapMode && s?.kind === "TERRAFORM" && !locked && (
                <div style={{ fontSize: 11, marginTop: 6, color: "#333" }}>Swap</div>
              )}
            </button>
          );
        })}
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
