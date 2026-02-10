import { chooseNextIntentEasy } from "./basicAi";
import type { AiContext } from "./aiTypes";
import type { ActionIntent } from "../ui/utils/actionValidation";

const MAX_STEPS_PER_TURN = 20;

export function createAiRunner(ctx: AiContext) {
  let cancelled = false;
  let timer: number | null = null;
  let running = false;

  function clearTimer() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function cancel() {
    cancelled = true;
    clearTimer();
    running = false;
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => {
      timer = window.setTimeout(() => {
        timer = null;
        resolve();
      }, ms);
    });
  }

  async function runOnce() {
    if (running) return;
    running = true;
    cancelled = false;

    const delayMs = ctx.ai.speed === "FAST" ? 150 : 350;

    for (let step = 0; step < MAX_STEPS_PER_TURN; step += 1) {
      if (cancelled || ctx.uiOverlayOpen() || ctx.isGameOver()) {
        break;
      }

      const state = ctx.getState();
      if (!ctx.ai.enabled || state.active !== ctx.ai.player) {
        break;
      }

      let intent: ActionIntent | null =
        ctx.ai.difficulty === "EASY" ? chooseNextIntentEasy(state, ctx.ai.player, ctx.ai.personality) : null;

      if (intent === null) {
        if (ctx.validateIntent(state, { type: "END_PLAY" }, {
          activePlayer: ctx.ai.player,
          playsRemaining: state.counters.playsRemaining,
          impactsRemaining: state.counters.impactsRemaining,
          abilitiesEnabled: (p: 0 | 1) => {
            const until = state.players[p].abilities.disabled_until_turn;
            return until === undefined || state.turn > until;
          },
          handSizeLimit: 3,
        }).ok) {
          intent = { type: "END_PLAY" };
        } else if (ctx.validateIntent(state, { type: "ADVANCE" }, {
          activePlayer: ctx.ai.player,
          playsRemaining: state.counters.playsRemaining,
          impactsRemaining: state.counters.impactsRemaining,
          abilitiesEnabled: (p: 0 | 1) => {
            const until = state.players[p].abilities.disabled_until_turn;
            return until === undefined || state.turn > until;
          },
          handSizeLimit: 3,
        }).ok) {
          intent = { type: "ADVANCE" };
        }
      }

      if (intent === null) {
        break;
      }

      const dispatched = ctx.dispatchIntent(intent);
      if (!dispatched) {
        break;
      }

      await wait(delayMs);
      if (cancelled || ctx.uiOverlayOpen() || ctx.isGameOver()) {
        break;
      }

      const next = ctx.getState();
      if (next.active !== ctx.ai.player) {
        break;
      }
    }

    running = false;
  }

  function startTurn() {
    const state = ctx.getState();
    if (!ctx.ai.enabled || ctx.uiOverlayOpen() || ctx.isGameOver()) return;
    if (state.active !== ctx.ai.player) return;
    void runOnce();
  }

  return { startTurn, cancel };
}
