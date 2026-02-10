import type { GameState } from "../engine/types";
import { type ActionIntent, validateIntent } from "../ui/utils/actionValidation";

export type AiDifficulty = "EASY";

export type AiPersonality = "BALANCED" | "BUILDER" | "AGGRESSIVE";

export type AiConfig = {
  enabled: boolean;
  player: 0 | 1;
  difficulty: AiDifficulty;
  speed: "FAST" | "NORMAL";
  personality: AiPersonality;
};

export type AiContext = {
  ai: AiConfig;
  dispatchIntent: (intent: ActionIntent) => boolean;
  validateIntent: typeof validateIntent;
  getState: () => GameState;
  uiOverlayOpen: () => boolean;
  isGameOver: () => boolean;
};
