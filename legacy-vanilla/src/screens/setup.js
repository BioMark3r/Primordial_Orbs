export function renderSetup({ state, setState, navigate }) {
  const root = document.createElement('div');
  root.className = 'screen stars';

  const mode = state.config.mode;

  root.innerHTML = `
    <div class="card">
      <div class="topBar">
        <span class="badge">Primordial Orbs • Setup</span>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn" id="backBtn">Back</button>
          <button class="btn btnPrimary" id="beginBtn">Begin Match</button>
        </div>
      </div>
      <div class="cardInner">
        <div class="row">
          <div>
            <h1 class="h1">Choose Mode</h1>
            <p class="p">
              This browser MVP uses a lightweight Vanilla JS UI layer.
              You can start solo (vs. AI placeholder) or local 2-player.
            </p>

            <div class="grid2" style="margin-top:14px;">
              <div class="panel">
                <h2 class="h2">Solo</h2>
                <p class="p">Play against a basic bot (placeholder until difficulty tuning lands).</p>
                <button class="btn ${mode === 'solo' ? 'btnPrimary' : ''}" id="soloBtn">Select Solo</button>
              </div>
              <div class="panel">
                <h2 class="h2">Local 2-Player</h2>
                <p class="p">Pass-and-play on the same device. Great for testing tactics.</p>
                <button class="btn ${mode === 'local' ? 'btnPrimary' : ''}" id="localBtn">Select Local</button>
              </div>
            </div>

            <ul class="list">
              <li>Next: Core selection + arena setup (hook point for your existing rules loop).</li>
              <li>Current build: splash + setup + game screen scaffold with state routing.</li>
            </ul>
          </div>

          <div>
            <div class="panel">
              <h2 class="h2">Quick Controls</h2>
              <p class="p"><span class="kbd">Esc</span> returns to Setup (in-game).</p>
              <p class="p"><span class="kbd">Enter</span> advances when prompted.</p>
              <p class="p" style="margin-bottom:0;">UI is structured so we can drop your full rules engine in without changing screens.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#backBtn').addEventListener('click', () => navigate('splash'));
  root.querySelector('#beginBtn').addEventListener('click', () => navigate('game'));

  root.querySelector('#soloBtn').addEventListener('click', () => {
    setState({ config: { ...state.config, mode: 'solo' } });
  });
  root.querySelector('#localBtn').addEventListener('click', () => {
    setState({ config: { ...state.config, mode: 'local' } });
  });

  return root;
}
