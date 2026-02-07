import type { GameState, Impact, Orb, PlayerState } from "./types";
import { colonizeCount, terraformCount } from "./rules";
import { MVP_TERRAFORM_MIN } from "./constants";

function pushLog(state: GameState, msg: string): GameState {
  return { ...state, log: [msg, ...state.log].slice(0, 200) };
}

function hasPlant(p: PlayerState): boolean {
  return p.planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "PLANT");
}

function hasHighTech(p: PlayerState): boolean {
  return p.planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "HIGH_TECH");
}

function removeRandomTerraformDeterministic(state: GameState, target: 0 | 1, count: number): GameState {
  // deterministic: remove terraform from highest index first
  let next = state;
  for (let k = 0; k < count; k++) {
    const p = next.players[target];
    const planet = p.planet;
    const slots = [...planet.slots];

    let idx = -1;
    for (let i = slots.length - 1; i >= 0; i--) {
      const o = slots[i];
      if (o?.kind === "TERRAFORM" && !planet.locked[i]) { idx = i; break; }
    }
    if (idx === -1) break;

    const removed = slots[idx]!;
    slots[idx] = null;

    const players = [...next.players] as GameState["players"];
    players[target] = { ...p, planet: { ...planet, slots } };

    next = pushLog({ ...next, players, discard: [...next.discard, removed] }, `Impact removed terraform at slot ${idx}.`);
  }
  return next;
}

function removeOneColonizationDeterministic(state: GameState, target: 0 | 1): GameState {
  const p = state.players[target];
  const planet = p.planet;
  const slots = [...planet.slots];

  const priority: Array<Orb & { kind: "COLONIZE" }> = [
    { kind: "COLONIZE", c: "HIGH_TECH" },
    { kind: "COLONIZE", c: "SENTIENT" },
    { kind: "COLONIZE", c: "ANIMAL" },
    { kind: "COLONIZE", c: "PLANT" },
  ];

  for (const desired of priority) {
    const idx = slots.findIndex((o, i) => o?.kind === "COLONIZE" && o.c === desired.c && !planet.locked[i]);
    if (idx !== -1) {
      const removed = slots[idx]!;
      slots[idx] = null;

      const players = [...state.players] as GameState["players"];
      players[target] = {
        ...p,
        planet: { ...planet, slots },
        vulnerability: colonizeCount({ ...state, players }, target),
      };

      return pushLog({ ...state, players, discard: [...state.discard, removed] }, `Black Hole removed colonization ${desired.c} (slot ${idx}).`);
    }
  }

  return pushLog(state, `No colonization to remove.`);
}

function downgradeDiseaseOnce(state: GameState, target: 0 | 1): GameState {
  const p = state.players[target];
  const planet = p.planet;
  const slots = [...planet.slots];

  const findIdx = (c: any) =>
    slots.findIndex((o, i) => o?.kind === "COLONIZE" && o.c === c && !planet.locked[i]);

  const sIdx = findIdx("SENTIENT");
  const aIdx = findIdx("ANIMAL");
  const pIdx = findIdx("PLANT");

  if (sIdx !== -1) {
    slots[sIdx] = { kind: "COLONIZE", c: "ANIMAL" };
    const players = [...state.players] as GameState["players"];
    players[target] = { ...p, planet: { ...planet, slots } };
    return pushLog({ ...state, players }, `Disease: SENTIENT → ANIMAL.`);
  }
  if (aIdx !== -1) {
    slots[aIdx] = { kind: "COLONIZE", c: "PLANT" };
    const players = [...state.players] as GameState["players"];
    players[target] = { ...p, planet: { ...planet, slots } };
    return pushLog({ ...state, players }, `Disease: ANIMAL → PLANT.`);
  }
  if (pIdx !== -1) {
    const removed = slots[pIdx]!;
    slots[pIdx] = null;
    const players = [...state.players] as GameState["players"];
    players[target] = { ...p, planet: { ...planet, slots }, vulnerability: colonizeCount({ ...state, players }, target) };
    return pushLog({ ...state, players, discard: [...state.discard, removed] }, `Disease removed PLANT.`);
  }

  return pushLog(state, `Disease had no valid target.`);
}

export function resetRoundFlags(state: GameState): GameState {
  const players = [...state.players] as GameState["players"];
  for (let i = 0; i < players.length; i++) {
    players[i] = { ...players[i], abilities: { ...players[i].abilities, plant_block_used_round: false } };
  }
  return { ...state, players };
}

export function checkTerraformMin(state: GameState, p: 0 | 1): boolean {
  return terraformCount(state, p) >= MVP_TERRAFORM_MIN;
}

export function markInstabilityIfNeeded(state: GameState, p: 0 | 1): GameState {
  if (checkTerraformMin(state, p)) return state;
  const ps = state.players[p];
  const players = [...state.players] as GameState["players"];
  players[p] = { ...ps, instability_strikes: ps.instability_strikes + 1 };
  return pushLog({ ...state, players }, `Planet instability! P${p} strikes: ${players[p].instability_strikes}.`);
}

export function applyImpactDeterministic(state: GameState, impact: Impact, source: 0 | 1, target: 0 | 1): GameState {
  let next = state;
  const tgt = next.players[target];

  // High-Tech redirect (MVP): auto-redirect BLACK_HOLE or METEOR once per game
  if (hasHighTech(tgt) && !tgt.abilities.hightech_redirect_used) {
    if (impact === "BLACK_HOLE" || impact === "METEOR") {
      const players = [...next.players] as GameState["players"];
      players[target] = { ...tgt, abilities: { ...tgt.abilities, hightech_redirect_used: true } };
      next = pushLog({ ...next, players }, `High-Tech redirected ${impact}!`);
      // redirect to source
      return applyImpactDeterministic(next, impact, source, source);
    }
  }

  const vuln = tgt.vulnerability;
  let severity = 1 + vuln;

  // Plant mitigation once per round: reduce severity by 1 (min 1)
  if (hasPlant(tgt) && !tgt.abilities.plant_block_used_round) {
    const players = [...next.players] as GameState["players"];
    players[target] = { ...tgt, abilities: { ...tgt.abilities, plant_block_used_round: true } };
    next = pushLog({ ...next, players }, `Plant reduced impact severity by 1.`);
    severity = Math.max(1, severity - 1);
  }

  switch (impact) {
    case "SOLAR_FLARE": {
      const until = next.turn + 1;
      const players = [...next.players] as GameState["players"];
      players[target] = { ...tgt, abilities: { ...tgt.abilities, disabled_until_turn: until } };
      return pushLog({ ...next, players }, `Solar Flare: abilities disabled until turn ${until}.`);
    }
    case "TEMPORAL_VORTEX":
      return pushLog(next, `Temporal Vortex: (MVP) undo not implemented.`);
    case "DISEASE": {
      for (let i = 0; i < severity; i++) next = downgradeDiseaseOnce(next, target);
      return next;
    }
    case "TORNADO": {
      // MVP: tornado causes disruption -> remove max(1, floor(severity/2)) terraform
      const removeN = Math.max(1, Math.floor(severity / 2));
      next = pushLog(next, `Tornado: disrupting terraform (${removeN}).`);
      return removeRandomTerraformDeterministic(next, target, removeN);
    }
    case "QUAKE":
      next = pushLog(next, `Quake: removing terraform (${severity}).`);
      return removeRandomTerraformDeterministic(next, target, severity);
    case "METEOR":
      next = pushLog(next, `Meteor: removing terraform (${severity}).`);
      return removeRandomTerraformDeterministic(next, target, severity);
    case "BLACK_HOLE": {
      // Prefer colonization removal; else remove 1 terraform
      const hasCol = tgt.planet.slots.some((s) => s?.kind === "COLONIZE");
      if (hasCol) return removeOneColonizationDeterministic(next, target);
      next = pushLog(next, `Black Hole: no colonization; removing 1 terraform.`);
      return removeRandomTerraformDeterministic(next, target, 1);
    }
  }
}
