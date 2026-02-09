import type { ActionEvent } from "./tutorialGuide";

export type TurnRecap = {
  title: string;
  bullets: string[];
};

type ListBucket = {
  label: string;
  items: string[];
  max: number;
};

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeList({ label, items, max }: ListBucket): string | null {
  if (items.length === 0) return null;
  if (items.length <= max) return `${label}: ${items.join(", ")}`;
  const shown = items.slice(0, max).join(", ");
  const extra = items.length - max;
  return `${label}: ${shown} +${extra} more`;
}

export function buildTurnRecap(events: ActionEvent[], player: 0 | 1): TurnRecap {
  const playerEvents = events.filter((event) => event.player === player);
  const placed: string[] = [];
  const impacts: string[] = [];
  const passives: string[] = [];

  playerEvents.forEach((event) => {
    switch (event.type) {
      case "PLAY_TERRAFORM":
        placed.push(formatLabel(event.terra));
        break;
      case "PLAY_COLONIZE":
        placed.push(formatLabel(event.colonize));
        break;
      case "PLAY_IMPACT":
        impacts.push(`${formatLabel(event.impact)} → P${event.target + 1}`);
        break;
      case "WATER_SWAP":
        passives.push("Water swap");
        break;
      case "GAS_REDRAW":
        passives.push("Gas redraw");
        break;
      default:
        break;
    }
  });

  const bullets: string[] = [];
  const placedSummary = summarizeList({ label: "Placed", items: placed, max: 2 });
  if (placedSummary) bullets.push(placedSummary);
  const impactSummary = summarizeList({ label: "Impacts", items: impacts, max: 2 });
  if (impactSummary) bullets.push(impactSummary);
  const passiveSummary = summarizeList({ label: "Passives", items: passives, max: 2 });
  if (passiveSummary) bullets.push(passiveSummary);

  if (bullets.length === 0) {
    bullets.push("No actions recorded.");
  }

  return {
    title: `Turn Recap — Player ${player + 1}`,
    bullets: bullets.slice(0, 4),
  };
}
