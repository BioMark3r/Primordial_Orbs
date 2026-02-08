import React, { useEffect, useMemo, useState } from "react";
import type { UIEvent } from "../../App";
import type { Impact } from "../../engine/types";
import { OrbToken } from "./OrbToken";
import { PileWidget } from "./PileWidget";

type ArenaViewProps = {
  lastEvent: UIEvent | null;
  bagCount: number;
  discardCount: number;
  activePlayer: 0 | 1;
  lastImpactName?: string;
  lastImpactIconPath?: string;
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
    return `→ Player ${event.target}`;
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
}: ArenaViewProps) {
  const [flightEvent, setFlightEvent] = useState<UIEvent | null>(null);
  const [bowlPulse, setBowlPulse] = useState(false);

  const impactLabel = useMemo(() => getImpactLabel(lastEvent, lastImpactName), [lastEvent, lastImpactName]);
  const impactTarget = useMemo(() => getImpactTarget(lastEvent), [lastEvent]);
  const impactEvent = lastEvent?.kind === "IMPACT_CAST" || lastEvent?.kind === "IMPACT_RESOLVED" ? lastEvent : null;

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

  return (
    <div className="arena-view">
      <div className="arena-view__header">
        <div className="arena-view__title">Cataclysm Arena</div>
        <div className="arena-view__subtitle">Active: Player {activePlayer + 1}</div>
      </div>
      <div className="arena-view__body">
        <div className="arena-view__bowl-wrap">
          <div className={`arena-view__bowl ${bowlPulse ? "arena-view__bowl--pulse" : ""}`} />
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
          <div className="arena-view__piles">
            <PileWidget title="Temporal Anomaly" count={bagCount} subtitle="Draw source" />
            <PileWidget title="Discard Pile" count={discardCount} subtitle="Spent orbs" />
          </div>
        </div>
      </div>
    </div>
  );
}
