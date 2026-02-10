import React from "react";
import type { Core } from "../../engine/types";
import type { AiPersonality } from "../../ai/aiTypes";
import type { ColonizeType, ProgressState } from "../utils/progress";
import type { PlanetViz } from "../utils/planetViz";
import { PlanetIcon } from "./PlanetIcon";
import { CoreBadge } from "./CoreBadge";
import { ProgressTrack } from "./ProgressTrack";

function personalityLabel(personality: AiPersonality): string {
  switch (personality) {
    case "BALANCED":
      return "Balanced";
    case "BUILDER":
      return "Builder";
    case "AGGRESSIVE":
      return "Aggressive";
    default:
      return "Balanced";
  }
}

type PlayerHeaderProps = {
  title: string;
  player: 0 | 1;
  core: Core;
  progress: ProgressState;
  pulseTypes?: ColonizeType[];
  planetViz: PlanetViz;
  isCpu?: boolean;
  cpuPersonality?: AiPersonality;
};

export function PlayerHeader(props: PlayerHeaderProps) {
  return (
    <div className="player-header__row">
      <div className="player-header__left">
        <PlanetIcon viz={props.planetViz} size={40} label={`${props.title} planet`} />
        <h3 className="player-header__title">
          <span>{props.title}</span>
          {props.isCpu && (
            <span className="player-header__badge">{`CPU (${personalityLabel(props.cpuPersonality ?? "BALANCED")})`}</span>
          )}
        </h3>
      </div>

      <div className="player-header__mid" aria-label={`Player ${props.player + 1} core and life`}>
        <div className="player-header__mini-group">
          <span className="player-header__mini-label">Core</span>
          <CoreBadge core={props.core} />
        </div>
        <div className="player-header__mini-group">
          <span className="player-header__mini-label">Life</span>
          <ProgressTrack
            player={props.player}
            testId={`progress-track-p${props.player}`}
            progress={props.progress}
            pulseTypes={props.pulseTypes}
            size="sm"
            title=""
          />
        </div>
      </div>
    </div>
  );
}
