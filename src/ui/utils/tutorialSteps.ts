import type { GuideTrigger } from "./tutorialGuide";

export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  targetId?: string;
  placement?: "top" | "right" | "bottom" | "left" | "center";
  advanceOn?: GuideTrigger;
  doThisNow?: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Primordial Orbs",
    body: "Terraform your planet, evolve life, and destabilize your opponent. First to 4 colonization types wins.",
    placement: "center",
  },
  {
    id: "controls",
    title: "Turn Flow Controls",
    body: "Your turn flows: Draw → Play → End Play → Advance. Use Undo while testing.",
    targetId: "ui-topbar-controls",
    placement: "bottom",
  },
  {
    id: "draw",
    title: "Draw Orbs",
    body: "Start by drawing 2 orbs from the Temporal Anomaly.",
    targetId: "ui-btn-draw",
    placement: "bottom",
    advanceOn: { kind: "ACTION", type: "DRAW_2" },
    doThisNow: "Click Draw 2.",
  },
  {
    id: "place_terraform",
    title: "Place Terraform",
    body: "Select a Terraform orb, then click an empty slot to place it.",
    targetId: "ui-hand-panel",
    placement: "top",
    advanceOn: { kind: "ACTION", type: "PLAY_TERRAFORM" },
    doThisNow: "Play a Terraform orb, then click an empty slot.",
  },
  {
    id: "impacts",
    title: "Impacts",
    body: "Impacts fire into the Cataclysm Arena and affected slots flash.",
    targetId: "ui-arena",
    placement: "left",
    advanceOn: { kind: "ACTION", type: "PLAY_IMPACT" },
    doThisNow: "Play an Impact orb.",
  },
  {
    id: "endplay",
    title: "End Play",
    body: "End Play when you’re done making moves.",
    targetId: "ui-btn-endplay",
    placement: "bottom",
    advanceOn: { kind: "ACTION", type: "END_PLAY" },
    doThisNow: "Click End Play.",
  },
  {
    id: "advance",
    title: "Advance Turn",
    body: "Advance to pass the turn and refresh turn-limited effects.",
    targetId: "ui-btn-advance",
    placement: "bottom",
    advanceOn: { kind: "ACTION", type: "ADVANCE" },
    doThisNow: "Click Advance.",
  },
  {
    id: "cores",
    title: "Core Status",
    body: "Each core has a passive and a weakness. The Core Status strip shows what’s available this turn.",
    targetId: "ui-core-status",
    placement: "bottom",
  },
  {
    id: "done",
    title: "All Set",
    body: "You’re ready. Open Tutorial anytime from the ? button.",
    placement: "center",
  },
];
