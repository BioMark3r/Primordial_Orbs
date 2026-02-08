// Primordial Orbs (Browser MVP shell)
// Vanilla JS, no build step.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const screens = {
  splash: $('#screen-splash'),
  setup: $('#screen-setup'),
  game: $('#screen-game'),
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('screen--active', k === name);
  });
  // small accessibility improvement
  const active = screens[name];
  if (active) active.focus?.();
}

// ---- Game state (lightweight placeholder) ----
const CORES = [
  { id: 'aether', name: 'Aether Core', passive: 'Flux: +1 energy on turn start.' },
  { id: 'ember', name: 'Ember Core', passive: 'Ignition: first hit each turn +1 damage.' },
  { id: 'tide', name: 'Tide Core', passive: 'Flow: heal 1 when you defend.' },
  { id: 'terra', name: 'Terra Core', passive: 'Bulwark: +1 shield at end of your turn.' },
  { id: 'void', name: 'Void Core', passive: 'Entropy: enemy gains -1 shield on their turn start.' },
];

const state = {
  mode: 'solo',
  p1: { name: 'Player 1', core: CORES[0], hp: 20, shield: 0, vortex: 0 },
  p2: { name: 'AI', core: CORES[1], hp: 20, shield: 0, vortex: 0 },
  turn: 1,
  active: 1,
};

function resetMatch() {
  state.turn = 1;
  state.active = 1;
  state.p1.hp = 20; state.p1.shield = 0; state.p1.vortex = 0;
  state.p2.hp = 20; state.p2.shield = 0; state.p2.vortex = 0;
  renderGame();
}

// ---- Setup wiring ----
const elMode = $('#mode');
const elP1Core = $('#p1-core');
const elP2Core = $('#p2-core');

function populateCores(selectEl) {
  selectEl.innerHTML = '';
  CORES.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    selectEl.appendChild(opt);
  });
}
populateCores(elP1Core);
populateCores(elP2Core);

function coreById(id) {
  return CORES.find(c => c.id === id) ?? CORES[0];
}

function applySetup() {
  state.mode = elMode.value;
  state.p1.core = coreById(elP1Core.value);
  state.p2.core = coreById(elP2Core.value);
  state.p2.name = (state.mode === 'solo') ? 'AI' : 'Player 2';
}

// ---- Game UI ----
const elTurn = $('#turn-label');
const elActive = $('#active-label');

const elP1Name = $('#p1-name');
const elP2Name = $('#p2-name');

const elP1Hp = $('#p1-hp');
const elP2Hp = $('#p2-hp');

const elP1Shield = $('#p1-shield');
const elP2Shield = $('#p2-shield');

const elP1CoreName = $('#p1-core-name');
const elP2CoreName = $('#p2-core-name');

const elP1CorePassive = $('#p1-core-passive');
const elP2CorePassive = $('#p2-core-passive');

const elP1Vortex = $('#p1-vortex');
const elP2Vortex = $('#p2-vortex');

const elLog = $('#log');

function log(msg) {
  const line = document.createElement('div');
  line.className = 'log__line';
  line.textContent = msg;
  elLog.appendChild(line);
  elLog.scrollTop = elLog.scrollHeight;
}

function renderGame() {
  elTurn.textContent = `Turn ${state.turn}`;
  elActive.textContent = `Active: ${state.active === 1 ? state.p1.name : state.p2.name}`;

  elP1Name.textContent = state.p1.name;
  elP2Name.textContent = state.p2.name;

  elP1Hp.textContent = `${state.p1.hp}`;
  elP2Hp.textContent = `${state.p2.hp}`;

  elP1Shield.textContent = `${state.p1.shield}`;
  elP2Shield.textContent = `${state.p2.shield}`;

  elP1CoreName.textContent = state.p1.core.name;
  elP2CoreName.textContent = state.p2.core.name;

  elP1CorePassive.textContent = state.p1.core.passive;
  elP2CorePassive.textContent = state.p2.core.passive;

  elP1Vortex.textContent = `${state.p1.vortex}/6`;
  elP2Vortex.textContent = `${state.p2.vortex}/6`;

  // highlight active
  $('#p1-strip').classList.toggle('strip--active', state.active === 1);
  $('#p2-strip').classList.toggle('strip--active', state.active === 2);
}

function endTurn() {
  // placeholder: grow vortex as a visible “system”
  const me = state.active === 1 ? state.p1 : state.p2;
  me.vortex = Math.min(6, me.vortex + 1);
  if (me.vortex === 6) {
    log(`${me.name} triggers Temporal Vortex! (placeholder effect: +2 shield)`);
    me.shield += 2;
    me.vortex = 0;
  }

  // swap
  state.active = state.active === 1 ? 2 : 1;
  if (state.active === 1) state.turn += 1;
  renderGame();
}

function attack() {
  const attacker = state.active === 1 ? state.p1 : state.p2;
  const defender = state.active === 1 ? state.p2 : state.p1;

  let dmg = 3;
  // tiny flavor for Ember to show passives wiring
  if (attacker.core.id === 'ember') dmg += 1;

  const blocked = Math.min(defender.shield, dmg);
  defender.shield -= blocked;
  dmg -= blocked;
  defender.hp = Math.max(0, defender.hp - dmg);

  log(`${attacker.name} attacks for ${dmg + blocked}. (${blocked} blocked)`);

  if (defender.hp === 0) {
    log(`${attacker.name} wins!`);
    $('#btn-attack').disabled = true;
    $('#btn-defend').disabled = true;
    $('#btn-end').disabled = true;
  }

  renderGame();
}

function defend() {
  const me = state.active === 1 ? state.p1 : state.p2;
  me.shield += 2;
  if (me.core.id === 'tide') {
    me.hp = Math.min(20, me.hp + 1);
    log(`${me.name} defends (+2 shield) and Flow heals 1.`);
  } else {
    log(`${me.name} defends (+2 shield).`);
  }
  renderGame();
}

// ---- Modal (Rulebook quick view) ----
const modal = $('#modal');
function openModal() {
  modal.classList.add('modal--open');
  modal.setAttribute('aria-hidden', 'false');
}
function closeModal() {
  modal.classList.remove('modal--open');
  modal.setAttribute('aria-hidden', 'true');
}

// ---- Events ----
$('#btn-start').addEventListener('click', () => showScreen('setup'));
$('#btn-rulebook').addEventListener('click', openModal);
$('#btn-back-to-splash').addEventListener('click', () => showScreen('splash'));
$('#btn-begin').addEventListener('click', () => {
  applySetup();
  resetMatch();
  // re-enable controls
  $('#btn-attack').disabled = false;
  $('#btn-defend').disabled = false;
  $('#btn-end').disabled = false;
  elLog.innerHTML = '';
  log(`Match start: ${state.p1.core.name} vs ${state.p2.core.name}`);
  showScreen('game');
});

$('#btn-attack').addEventListener('click', attack);
$('#btn-defend').addEventListener('click', defend);
$('#btn-end').addEventListener('click', endTurn);
$('#btn-reset').addEventListener('click', () => {
  $('#btn-attack').disabled = false;
  $('#btn-defend').disabled = false;
  $('#btn-end').disabled = false;
  elLog.innerHTML = '';
  resetMatch();
  log('Match reset.');
});

$$('[data-close="1"]').forEach(el => el.addEventListener('click', closeModal));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && screens.splash.classList.contains('screen--active')) {
    showScreen('setup');
  }
});

// init
showScreen('splash');
renderGame();
