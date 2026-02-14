import React, { useEffect, useMemo, useState } from "react";
import type { UIEvent } from "../../App";
import type { Impact } from "../../engine/types";
import { fxForImpact } from "../utils/impactFx";
import type { PlanetViz } from "../utils/planetViz";
import { OrbToken } from "./OrbToken";
import { PlanetIcon } from "./PlanetIcon";
import { PileWidget } from "./PileWidget";

type ArenaViewProps = {
  lastEvent: UIEvent | null;
  bagCount: number;
  discardCount: number;
  activePlayer: 0 | 1;
  lastImpactName?: string;
  lastImpactIconPath?: string;
  p0Viz: PlanetViz;
  p1Viz: PlanetViz;
};

function getImpactLabel(event: UIEvent | null, fallback?: string) {
  if (!event) return fallback ?? "—";
  if (event.kind === "IMPACT_CAST" || event.kind === "IMPACT_RESOLVED") {
    return event.impact;
  }
  return fallback ?? "—";
}

function getImpactTarget(event: UIEvent | null) {
  if (!event) return "—";
  if (event.kind === "IMPACT_CAST" || event.kind === "IMPACT_RESOLVED") {
    return `→ Player ${event.target + 1}`;
  }
  return "—";
}

export function ArenaView({
  lastEvent,
  bagCount,
  discardCount,
  activePlayer,
  lastImpactName,
  lastImpactIconPath,
  p0Viz,
  p1Viz,
}: ArenaViewProps) {
  const [flightEvent, setFlightEvent] = useState<UIEvent | null>(null);
  const [bowlPulse, setBowlPulse] = useState(false);
  const [bowlFx, setBowlFx] = useState<{
    key: string;
    className: string;
    accent: string;
    landed: boolean;
  } | null>(null);
  const [impactResult, setImpactResult] = useState<string | null>(null);
  const [targetPulse, setTargetPulse] = useState<0 | 1 | null>(null);

  const impactLabel = useMemo(() => getImpactLabel(lastEvent, lastImpactName), [lastEvent, lastImpactName]);
  const impactTarget = useMemo(() => getImpactTarget(lastEvent), [lastEvent]);
  const impactEvent = lastEvent?.kind === "IMPACT_CAST" || lastEvent?.kind === "IMPACT_RESOLVED" ? lastEvent : null;
  const arenaStatusLabel = impactEvent ? `Resolving: ${impactLabel}` : "Arena";

  useEffect(() => {
    if (lastEvent?.kind !== "IMPACT_CAST") return;
    setFlightEvent(lastEvent);
    const pulseTimer = window.setTimeout(() => setBowlPulse(true), 520);
    const clearPulse = window.setTimeout(() => setBowlPulse(false), 1020);
    const clearFlight = window.setTimeout(() => setFlightEvent(null), 700);
    return () => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(clearPulse);
      window.clearTimeout(clearFlight);
    };
  }, [lastEvent]);

  useEffect(() => {
    if (impactEvent?.kind !== "IMPACT_RESOLVED") return;
    const fx = fxForImpact(impactEvent.impact);
    const fxKey = `${impactEvent.kind}-${impactEvent.at}`;
    setBowlFx({ key: fxKey, className: fx.bowlClass, accent: fx.accent, landed: true });
    const clearFx = window.setTimeout(() => {
      setBowlFx((prev) => (prev?.key === fxKey ? null : prev));
    }, 900);

    setBowlPulse(true);
    setTargetPulse(impactEvent.target);
    const affectedCount = impactEvent.affectedSlots?.length ?? 0;
    const slotLabel = affectedCount === 1 ? "slot" : "slots";
    const result = `${fx.label}: ${affectedCount} ${slotLabel} changed`;
    setImpactResult(result);

    const clearResult = window.setTimeout(() => setImpactResult(null), 1000);
    const clearPulse = window.setTimeout(() => setBowlPulse(false), 420);
    const clearTargetPulse = window.setTimeout(() => {
      setTargetPulse((prev) => (prev === impactEvent.target ? null : prev));
    }, 850);

    return () => {
      window.clearTimeout(clearFx);
      window.clearTimeout(clearResult);
      window.clearTimeout(clearPulse);
      window.clearTimeout(clearTargetPulse);
    };
  }, [impactEvent]);

  return (
    <div className={`arena-view${impactEvent ? " arena-view--active" : ""}`}>
      <div className="arena-view__header">
        <div className={`arena-view__planet arena-view__planet--left${targetPulse === 0 ? " arena-view__planet--target-pulse" : ""}`}>
          <PlanetIcon viz={p0Viz} size={34} label="Player 1 planet" pulse={targetPulse === 0} />
        </div>
        <div className="arena-view__title-wrap">
          <div className="arena-view__title">Cataclysm Arena</div>
          <div className="arena-view__subtitle">Active: Player {activePlayer + 1}</div>
          <div className="arena-view__status">{arenaStatusLabel}</div>
        </div>
        <div className={`arena-view__planet arena-view__planet--right${targetPulse === 1 ? " arena-view__planet--target-pulse" : ""}`}>
          <PlanetIcon viz={p1Viz} size={34} label="Player 2 planet" pulse={targetPulse === 1} />
        </div>
      </div>
      <div className="arena-view__body">
        <div className="arena-view__bowl-wrap">
          <div className={`arena-view__bowl ${bowlPulse ? "arena-view__bowl--pulse" : ""}`} />
          {bowlFx && (
            <div
              key={bowlFx.key}
              className={`arena-view__bowl-fx ${bowlFx.className}${bowlFx.landed ? " arena-view__bowl-fx--landed" : ""}`}
              style={{ ["--fx-accent" as string]: bowlFx.accent } as React.CSSProperties}
              aria-hidden
            />
          )}
          {flightEvent?.kind === "IMPACT_CAST" && (
            <div
              className={`arena-view__orb-flight ${
                flightEvent.source === 0 ? "arena-view__orb-flight--left" : "arena-view__orb-flight--right"
              }`}
            />
          )}
        </div>
        <div className="arena-view__readout">
          <div className="arena-view__label">Last Impact</div>
          <div className="arena-view__impact">
            {lastImpactIconPath ? (
              <img src={lastImpactIconPath} alt="" />
            ) : impactEvent ? (
              <OrbToken orb={{ kind: "IMPACT", i: impactEvent.impact as Impact }} size="md" />
            ) : (
              <div className="arena-view__impact-placeholder" />
            )}
            <div>
              <div className="arena-view__impact-name">{impactLabel}</div>
              <div className="arena-view__impact-target">{impactTarget}</div>
            </div>
          </div>
          {impactResult && <div className="arena-view__impact-result">{impactResult}</div>}
          <div className="arena-view__piles">
            <PileWidget title="Temporal Anomaly" count={bagCount} subtitle="Draw source" compact />
            <PileWidget title="Discard Pile" count={discardCount} subtitle="Spent orbs" compact />
          </div>
        </div>
      </div>
    </div>
  );
}
