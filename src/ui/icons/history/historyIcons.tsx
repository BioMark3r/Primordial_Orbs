import React from "react";
import type { ReplayEntryV1 } from "../../utils/actionLog";

type IconProps = { className?: string };

function baseIcon(path: React.ReactNode, className?: string) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className={className}>
      {path}
    </svg>
  );
}

const TerraformIcon = ({ className }: IconProps) =>
  baseIcon(<path d="M8 1c-2.2 0-4 1.8-4 4 0 1.2.5 2.2 1.4 3H3v2h3v3h2V9h2c1.7 0 3-1.3 3-3s-1.3-3-3-3H8z" fill="currentColor" />, className);

const ColonizeIcon = ({ className }: IconProps) =>
  baseIcon(
    <>
      <path d="M8 2v12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 7c0-2.3 1.8-4 4-4-.1 2.3-1.8 4-4 4zM8 9c0 2.3-1.8 4-4 4 .1-2.3 1.8-4 4-4z" fill="currentColor" />
    </>,
    className,
  );

const ImpactIcon = ({ className }: IconProps) =>
  baseIcon(<path d="M9.5 1 3 9h4l-1 6 7-9H9l.5-5z" fill="currentColor" />, className);

const CoreIcon = ({ className }: IconProps) =>
  baseIcon(<path d="m8 1.5 1.7 3.4 3.8.6-2.7 2.6.6 3.8L8 10.1 4.6 12l.7-3.8L2.5 5.5l3.8-.6L8 1.5z" fill="currentColor" />, className);

const DrawIcon = ({ className }: IconProps) =>
  baseIcon(
    <>
      <rect x="3" y="3" width="8" height="10" rx="1.5" stroke="currentColor" fill="none" />
      <path d="M6 1.8h7.2V11" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </>,
    className,
  );

const AdvanceIcon = ({ className }: IconProps) =>
  baseIcon(<path d="M3 8h8M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />, className);

const UndoIcon = ({ className }: IconProps) =>
  baseIcon(<path d="M6 4 2.5 7.5 6 11M3 7.5h5a4 4 0 1 1 0 8" transform="translate(0 -2)" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />, className);

function mapEntryType(type: string): "terraform" | "colonize" | "impact" | "core" | "draw" | "advance" | "undo" {
  if (type.includes("TERRAFORM")) return "terraform";
  if (type.includes("COLONIZE")) return "colonize";
  if (type.includes("IMPACT")) return "impact";
  if (type.includes("WATER_SWAP") || type.includes("GAS_REDRAW")) return "core";
  if (type.includes("DRAW")) return "draw";
  if (type.includes("ADVANCE") || type.includes("END_PLAY")) return "advance";
  return "undo";
}

export function HistoryTypeIcon({ entry, className }: { entry: ReplayEntryV1; className?: string }) {
  switch (mapEntryType(entry.type)) {
    case "terraform":
      return <TerraformIcon className={className} />;
    case "colonize":
      return <ColonizeIcon className={className} />;
    case "impact":
      return <ImpactIcon className={className} />;
    case "core":
      return <CoreIcon className={className} />;
    case "draw":
      return <DrawIcon className={className} />;
    case "advance":
      return <AdvanceIcon className={className} />;
    default:
      return <UndoIcon className={className} />;
  }
}

export function historyTypeTone(type: string): "impact" | "default" {
  return type.includes("IMPACT") ? "impact" : "default";
}
