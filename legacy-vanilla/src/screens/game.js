export function renderGame({ state, navigate }) {
  const root = document.createElement('div');
  root.className = 'screen stars';

  root.innerHTML = `
    <div class="card">
      <div class="topBar">
        <span class="badge">Match • ${state.config.mode === 'solo' ? 'Solo' : 'Local 2-Player'}</span>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn" id="setupBtn">Setup</button>
          <button class="btn btnPrimary" id="nextBtn">Next</button>
        </div>
      </div>
      <div class="cardInner">
        <div class="row">
          <div>
            <h1 class="h1">Game Screen (Scaffold)</h1>
            <p class="p">
              This is the hook point to plug in the full Primordial Orbs loop (cores, orbs, target-by-default, temporal vortex, status strip, etc.).
            </p>
            <div class="panel">
              <div class="small">Status</div>
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
                <span class="badge">Turn: 1</span>
                <span class="badge">Phase: Planning</span>
                <span class="badge">Active Core: —</span>
              </div>
              <p class="p" style="margin-top:12px; margin-bottom:0;">
                Replace this panel with the real in-match HUD once we drop in the rules engine.
              </p>
            </div>
          </div>
          <div>
            <div class="panel">
              <h2 class="h2">What’s wired</h2>
              <ul class="list" style="margin-top:0;">
                <li>Splash screen uses the generated logo asset.</li>
                <li>Setup flow routes cleanly into the match screen.</li>
                <li>Keyboard escape hatch: <span class="kbd">Esc</span> returns to Setup.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#setupBtn').addEventListener('click', () => navigate('setup'));
  root.querySelector('#nextBtn').addEventListener('click', () => {
    // Placeholder: advance phase/turn once rules engine is connected
    alert('Next step hook — connect to game loop reducer/state machine.');
  });

  const onKey = (e) => {
    if (e.key === 'Escape') navigate('setup');
  };
  window.addEventListener('keydown', onKey);

  // Cleanup listener when screen is removed
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('keydown', onKey);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  return root;
}
