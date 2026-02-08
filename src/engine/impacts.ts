import type { GameState, Impact, Orb, PlayerState } from "./types";
import { colonizeCount, terraformCount } from "./rules";
import { MVP_TERRAFORM_MIN } from "./constants";

function pushLog(state: GameState, msg: string): GameState {
  return { ...state, log: [msg, ...state.log].slice(0, 200) };
}

function abilitiesEnabled(state: GameState, p: 0 | 1): boolean {
  const until = state.players[p].abilities.disabled_until_turn;
  return until === undefined || state.turn > until;
}

function clonePlanet(planet: { core: any; slots: any[]; locked: boolean[] }) {
  return { core: planet.core, slots: [...planet.slots], locked: [...planet.locked] };
}

function recordPlanet(state: GameState, p: 0 | 1): GameState {
  const ph = [...state.planetHistory] as GameState["planetHistory"];
  const list = [...ph[p], clonePlanet(state.players[p].planet)];
  ph[p] = list;
  return { ...state, planetHistory: ph };
}


function hasPlant(p: PlayerState): boolean {
  return p.planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "PLANT");
}

function hasHighTech(p: PlayerState): boolean {
  return p.planet.slots.some((s) => s?.kind === "COLONIZE" && s.c === "HIGH_TECH");
}

function removeRandomTerraformDeterministic(state: GameState, target: 0 | 1, count: number): GameState {
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

    next = { ...next, players, discard: [...next.discard, removed] };
    next = recordPlanet(next, target);
    next = pushLog(next, `Impact removed terraform at slot ${idx}.`);
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

      let next = { ...state, players, discard: [...state.discard, removed] };
      next = recordPlanet(next, target);
      return pushLog(next, `Black Hole removed colonization ${desired.c} (slot ${idx}).`);
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
    let next = { ...state, players };
    next = recordPlanet(next, target);
    return pushLog(next, `Disease: SENTIENT → ANIMAL.`);
  }
  if (aIdx !== -1) {
    slots[aIdx] = { kind: "COLONIZE", c: "PLANT" };
    const players = [...state.players] as GameState["players"];
    players[target] = { ...p, planet: { ...planet, slots } };
    let next = { ...state, players };
    next = recordPlanet(next, target);
    return pushLog(next, `Disease: ANIMAL → PLANT.`);
  }
  if (pIdx !== -1) {
    const removed = slots[pIdx]!;
    slots[pIdx] = null;
    const players = [...state.players] as GameState["players"];
    players[target] = { ...p, planet: { ...planet, slots }, vulnerability: colonizeCount({ ...state, players }, target) };
    let next = { ...state, players, discard: [...state.discard, removed] };
    next = recordPlanet(next, target);
    return pushLog(next, `Disease removed PLANT.`);
  }
  return pushLog(state, `Disease had no valid target.`);
}

export function resetRoundFlags(state: GameState): GameState {
  const players = [...state.players] as GameState["players"];
  for (let i = 0; i < players.length; i++) {
    players[i] = {
      ...players[i],
      abilities: {
        ...players[i].abilities,
        plant_block_used_round: false,
        land_free_terraform_used_turn: false,
        water_swap_used_turn: false,
        gas_redraw_used_turn: false,
        ice_shield_used_turn: false,
      },
    };
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
  const strikes = ps.planet.core === "LAVA" ? 2 : 1; // Lava weakness
  players[p] = { ...ps, instability_strikes: ps.instability_strikes + strikes };
  return pushLog({ ...state, players }, `Planet instability! P${p} strikes: ${players[p].instability_strikes}.`);
}

export function applyImpactDeterministic(state: GameState, impact: Impact, source: 0 | 1, target: 0 | 1): GameState {
  let next = state;
  const tgt = next.players[target];

  // High-Tech redirect
  if (abilitiesEnabled(next, target) && hasHighTech(tgt) && !tgt.abilities.hightech_redirect_used) {
    if (impact === "BLACK_HOLE" || impact === "METEOR") {
      const players = [...next.players] as GameState["players"];
      players[target] = { ...tgt, abilities: { ...tgt.abilities, hightech_redirect_used: true } };
      next = pushLog({ ...next, players }, `High-Tech redirected ${impact}!`);
      return applyImpactDeterministic(next, impact, source, source);
    }
  }

  const vuln = tgt.vulnerability;
  let severity = 1 + vuln;

  // Lava passive: outgoing impacts +1 severity
  if (next.players[source].planet.core === "LAVA" && abilitiesEnabled(next, source)) {
    severity += 1;
    next = pushLog(next, `Lava core increased impact severity by 1.`);
  }

  // Water weakness: disease severity +1
  if (impact === "DISEASE" && tgt.planet.core === "WATER") {
    severity += 1;
    next = pushLog(next, `Water weakness: Disease severity +1.`);
  }

  // Ice passive: first impact vs you each turn -1 severity
  if (tgt.planet.core === "ICE" && abilitiesEnabled(next, target) && !tgt.abilities.ice_shield_used_turn) {
    severity = Math.max(1, severity - 1);
    const players = [...next.players] as GameState["players"];
    players[target] = { ...tgt, abilities: { ...tgt.abilities, ice_shield_used_turn: true } };
    next = pushLog({ ...next, players }, `Ice core reduced impact severity by 1.`);
  }

  // Plant mitigation once per round
  if (abilitiesEnabled(next, target) && hasPlant(tgt) && !tgt.abilities.plant_block_used_round) {
    const players = [...next.players] as GameState["players"];
    players[target] = { ...tgt, abilities: { ...tgt.abilities, plant_block_used_round: true } };
    next = pushLog({ ...next, players }, `Plant reduced impact severity by 1.`);
    severity = Math.max(1, severity - 1);
  }

  const landExtra = tgt.planet.core === "LAND" ? 1 : 0;

  switch (impact) {
    case "SOLAR_FLARE": {
      const until = next.turn + 1;
      const players = [...next.players] as GameState["players"];
      players[target] = { ...tgt, abilities: { ...tgt.abilities, disabled_until_turn: until } };
      return pushLog({ ...next, players }, `Solar Flare: abilities disabled until turn ${until}.`);
    }
    case "TEMPORAL_VORTEX": {
      const hist = next.planetHistory[target];
      if (!hist || hist.length <= 1) return pushLog(next, `Temporal Vortex: no time echo to rewind.`);

      // Rewind target planet by 1 snapshot (deterministic)
      const ph = [...next.planetHistory] as GameState["planetHistory"];
      const newHist = hist.slice(0, -1);
      const restored = newHist[newHist.length - 1];
      ph[target] = newHist;

      const players = [...next.players] as GameState["players"];
      const restoredPlanet = clonePlanet(restored);
      players[target] = {
        ...players[target],
        planet: restoredPlanet,
      };

      // Recalculate vulnerability from restored planet
      const tmp: GameState = { ...next, players };
      players[target] = { ...players[target], vulnerability: colonizeCount(tmp, target) };

      next = { ...next, players, planetHistory: ph };
      next = pushLog(next, `Temporal Vortex rewound P${target}'s planet by 1 step.`);
      return next;
    }
    case "DISEASE": {
      for (let i = 0; i < severity; i++) next = downgradeDiseaseOnce(next, target);
      return next;
    }
    case "TORNADO": {
      const removeN = Math.max(1, Math.floor(severity / 2)) + landExtra;
      next = pushLog(next, `Tornado: disrupting terraform (${removeN}).${landExtra ? " (Land weakness +1)" : ""}`);
      return removeRandomTerraformDeterministic(next, target, removeN);
    }
    case "QUAKE": {
      const removeN = severity + landExtra;
      next = pushLog(next, `Quake: removing terraform (${removeN}).${landExtra ? " (Land weakness +1)" : ""}`);
      return removeRandomTerraformDeterministic(next, target, removeN);
    }
    case "METEOR": {
      const removeN = severity + landExtra;
      next = pushLog(next, `Meteor: removing terraform (${removeN}).${landExtra ? " (Land weakness +1)" : ""}`);
      return removeRandomTerraformDeterministic(next, target, removeN);
    }
    case "BLACK_HOLE": {
      const hasCol = tgt.planet.slots.some((s) => s?.kind === "COLONIZE");
      if (hasCol) return removeOneColonizationDeterministic(next, target);
      const removeN = 1 + landExtra;
      next = pushLog(next, `Black Hole: no colonization; removing ${removeN} terraform.${landExtra ? " (Land weakness +1)" : ""}`);
      return removeRandomTerraformDeterministic(next, target, removeN);
    }
  }
}
