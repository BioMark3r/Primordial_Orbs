export function renderSplash({ navigate }) {
  const root = document.createElement('div');
  root.className = 'splash stars';

  root.innerHTML = `
    <div class="splashLogoWrap">
      <img class="logo" src="assets/logo.png" alt="Primordial Orbs" />
      <p class="subtext">
        A tactical duel of planet-cores, orbs, and temporal power.
      </p>
      <div class="splashActions">
        <button class="btn btnPrimary" id="startBtn">Start</button>
        <button class="btn" id="ruleBtn">Rulebook</button>
      </div>
      <p class="small">Tip: Press <span class="kbd">Enter</span> to start.</p>
    </div>
  `;

  const start = () => navigate('setup');
  root.querySelector('#startBtn').addEventListener('click', start);
  root.querySelector('#ruleBtn').addEventListener('click', () => {
    // Opens local RULEBOOK.md if served from a server that can render it;
    // otherwise it will just download / display raw markdown.
    window.open('RULEBOOK.md', '_blank', 'noopener');
  });

  const onKey = (e) => {
    if (e.key === 'Enter') start();
  };
  window.addEventListener('keydown', onKey, { once: true });

  return root;
}
