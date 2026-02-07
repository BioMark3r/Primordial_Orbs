import React, { useMemo, useReducer, useState } from "react";
import type { Core, GameState, Mode, Orb } from "./engine/types";
import { reducer } from "./engine/reducer";
import { newGame } from "./engine/setup";

type Screen = "TITLE" | "SETUP" | "GAME";
type Selected = { kind: "NONE" } | { kind: "HAND"; handIndex: number; orb: Orb };

const CORES: Core[] = ["LAND", "WATER", "ICE", "LAVA", "GAS"];

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

export default function App() {
  const initial = useMemo(() => newGame("LOCAL_2P", "LAND", "ICE", Date.now()), []);
  const [state, dispatch] = useReducer(reducer, initial);

  const [screen, setScreen] = useState<Screen>("TITLE");
  const [mode] = useState<Mode>("LOCAL_2P"); // A1: Local 2P only wired
  const [p0Core, setP0Core] = useState<Core>("LAND");
  const [p1Core, setP1Core] = useState<Core>("ICE");
  const [selected, setSelected] = useState<Selected>({ kind: "NONE" });

  const containerStyle: React.CSSProperties = {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    maxWidth: 1100,
    margin: "0 auto",
  };

  function startGame() {
    setSelected({ kind: "NONE" });
    dispatch({ type: "NEW_GAME", mode, coreP0: p0Core, coreP1: p1Core, seed: Date.now() });
    setScreen("GAME");
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

  const showDiscard = state.phase === "DRAW" && isHandOverflow(state);

  function clearSelection() {
    setSelected({ kind: "NONE" });
  }

  function onClickHand(i: number) {
    const orb = activeHand[i];
    if (!orb) return;

    if (state.phase === "PLAY" && orb.kind === "IMPACT") {
      dispatch({ type: "PLAY_IMPACT", handIndex: i }); // default target opponent
      clearSelection();
      return;
    }

    setSelected({ kind: "HAND", handIndex: i, orb });
  }

  function onClickSlot(slotIndex: number) {
    if (state.phase !== "PLAY") return;
    if (selected.kind !== "HAND") return;

    const { handIndex, orb } = selected;

    if (orb.kind === "TERRAFORM") {
      dispatch({ type: "PLAY_TERRAFORM", handIndex, slotIndex });
      clearSelection();
      return;
    }
    if (orb.kind === "COLONIZE") {
      dispatch({ type: "PLAY_COLONIZE", handIndex, slotIndex });
      clearSelection();
      return;
    }
  }

  function onDiscardIndex(i: number) {
    dispatch({ type: "DISCARD_FROM_HAND", index: i });
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
        <button onClick={() => setScreen("SETUP")}>Setup</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            clearSelection();
            dispatch({ type: "NEW_GAME", mode: "LOCAL_2P", coreP0: p0Core, coreP1: p1Core, seed: Date.now() });
          }}
        >
          New Game
        </button>

        <button disabled={!canDraw} onClick={() => { clearSelection(); dispatch({ type: "DRAW_2" }); }}>
          Draw 2
        </button>

        <button disabled={!canEndPlay} onClick={() => { clearSelection(); dispatch({ type: "END_PLAY" }); }}>
          End Play
        </button>

        <button disabled={!canAdvance} onClick={() => { clearSelection(); dispatch({ type: "ADVANCE" }); }}>
          Advance
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          <div><b>Plays:</b> {playsRemaining}/2</div>
          <div><b>Impacts:</b> {impactsRemaining}/1</div>
          <div><b>Hand:</b> {activeHand.length}/3</div>
        </div>
      </div>

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <PlayerPanel
          title={`Player ${active} (Active)`}
          core={activePlanet.core}
          planetSlots={activePlanet.slots}
          locked={activePlanet.locked}
          terraformMin={3}
          onClickSlot={onClickSlot}
          selected={selected}
        />
        <PlayerPanel
          title={`Player ${other}`}
          core={otherPlanet.core}
          planetSlots={otherPlanet.slots}
          locked={otherPlanet.locked}
          terraformMin={3}
          selected={{ kind: "NONE" }}
        />
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #bbb", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Hand (P{active})</h3>
          <div style={{ color: "#555" }}>
            Click Terraform/Colonize then click a slot. Click Impact to fire at opponent.
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
                onClick={() => onClickHand(i)}
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
                {isImpact && <div style={{ fontSize: 12, marginTop: 4 }}>Targets Opponent</div>}
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
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #bbb", borderRadius: 10 }}>
        <h3 style={{ margin: 0 }}>Event Log</h3>
        <div style={{ marginTop: 8, maxHeight: 240, overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
          {state.log.slice(0, 80).map((line, idx) => (
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

function PlayerPanel(props: {
  title: string;
  core: any;
  planetSlots: (Orb | null)[];
  locked: boolean[];
  terraformMin: number;
  onClickSlot?: (i: number) => void;
  selected: Selected;
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

          return (
            <button
              key={i}
              onClick={() => props.onClickSlot?.(i)}
              disabled={!clickable}
              style={{
                padding: "14px 10px",
                borderRadius: 12,
                border: "1px solid #999",
                minHeight: 64,
                textAlign: "center",
                cursor: clickable ? "pointer" : "default",
                opacity: clickable ? 1 : 0.92,
              }}
              title={locked ? "Locked slot" : "Planet slot"}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{slotText(s)}</div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Slot {i + 1}{locked ? " • Locked" : ""}
              </div>
              {showHint && !s && !locked && (
                <div style={{ fontSize: 11, marginTop: 6, color: "#333" }}>Place here</div>
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
      return { passive: "First terraform placed each turn is free (future wiring).", weakness: "Impacts affect adjacent slots (future wiring).", style: "Stable builder." };
    case "WATER":
      return { passive: "Once per turn, swap two terraform orbs (future wiring).", weakness: "Disease impacts hit twice (future wiring).", style: "Adaptive control." };
    case "ICE":
      return { passive: "First impact against you each round reduced (future wiring).", weakness: "Lava removes Ice automatically (future wiring).", style: "Defensive fortress." };
    case "LAVA":
      return { passive: "Your impacts gain +1 effect (future wiring).", weakness: "Destabilizes faster (future wiring).", style: "Aggressive pressure." };
    case "GAS":
      return { passive: "Once per turn, redraw one drawn orb (future wiring).", weakness: "Cannot place Ice naturally (future wiring).", style: "Wildcard, hand control." };
  }
}
