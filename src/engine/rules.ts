import type { Colonize, GameState, Orb, Terraform } from "./types";
import { COLONIZE_REQ, HAND_CAP, MVP_PLANET_SLOTS, MVP_TERRAFORM_MIN } from "./constants";

export function planetTerraformSet(state: GameState, p: 0 | 1): Set<Terraform> {
  const set = new Set<Terraform>();
  for (const s of state.players[p].planet.slots) if (s?.kind === "TERRAFORM") set.add(s.t);
  return set;
}

export function planetColonizeSet(state: GameState, p: 0 | 1): Set<Colonize> {
  const set = new Set<Colonize>();
  for (const s of state.players[p].planet.slots) if (s?.kind === "COLONIZE") set.add(s.c);
  return set;
}

export function terraformCount(state: GameState, p: 0 | 1): number {
  return state.players[p].planet.slots.filter((s) => s?.kind === "TERRAFORM").length;
}

export function colonizeCount(state: GameState, p: 0 | 1): number {
  return state.players[p].planet.slots.filter((s) => s?.kind === "COLONIZE").length;
}

export function isHandOverflow(hand: Orb[]) {
  return hand.length > HAND_CAP;
}

export function withinSlots(slotIndex: number) {
  return slotIndex >= 0 && slotIndex < MVP_PLANET_SLOTS;
}

export function canPlaceTerraform(state: GameState, p: 0 | 1, slotIndex: number): boolean {
  if (!withinSlots(slotIndex)) return false;
  const planet = state.players[p].planet;
  if (planet.locked[slotIndex]) return false;
  if (planet.slots[slotIndex] !== null) return false;
  return true;
}

export function canPlaceColonize(state: GameState, p: 0 | 1, col: Colonize, slotIndex: number): boolean {
  if (!withinSlots(slotIndex)) return false;
  const planet = state.players[p].planet;
  if (planet.locked[slotIndex]) return false;
  if (planet.slots[slotIndex] !== null) return false;

  const tSet = planetTerraformSet(state, p);
  const cSet = planetColonizeSet(state, p);
  return COLONIZE_REQ[col](tSet, cSet);
}

export function maintainsTerraformMin(nextTerraformCount: number): boolean {
  return nextTerraformCount >= MVP_TERRAFORM_MIN;
}
