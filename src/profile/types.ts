export type ProfileId = string;

export type Profile = {
  id: ProfileId;
  name: string;
  pinHash: string;
  createdAt: number;
  lastActiveAt: number;
};

export type Session = {
  activeProfileId: ProfileId | null;
  unlockedUntil?: number;
};

export type MatchMode = "HOTSEAT" | "CPU";

export type MatchResult = {
  id: string;
  ts: number;
  version?: string;
  mode: MatchMode;
  p0ProfileId: ProfileId | null;
  p1ProfileId: ProfileId | null;
  cpuPersonality?: "BALANCED" | "BUILDER" | "AGGRESSIVE";
  winnerPlayer: 0 | 1;
  turns?: number;
  setup: {
    p0Core: string;
    p1Core: string;
    p0Size: string;
    p1Size: string;
    setupStyle?: string;
  };
};
