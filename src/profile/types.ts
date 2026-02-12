export type ProfileId = string;

export const GUEST_ID = "guest";
export const CPU_ID = "cpu";

export type Profile = {
  id: ProfileId;
  name: string;
  pinHash: string;
  createdAt: number;
  lastActiveAt: number;
};

export type Session = {
  activeProfileId: ProfileId;
  unlockedUntil?: number;
};

export type MatchMode = "HOTSEAT" | "CPU";

export type MatchResult = {
  id: string;
  ts: number;
  version?: string;
  mode: MatchMode;
  p0ProfileId: ProfileId;
  p1ProfileId: ProfileId | typeof CPU_ID;
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
