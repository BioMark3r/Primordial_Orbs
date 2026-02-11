import { loadMatches, saveMatches, touchProfile } from "./store";
import type { MatchResult, ProfileId } from "./types";

const MAX_MATCH_HISTORY = 300;

export function appendMatchResult(result: MatchResult): MatchResult[] {
  const current = loadMatches();
  const next = [...current, result].slice(-MAX_MATCH_HISTORY);
  saveMatches(next);
  if (result.p0ProfileId) touchProfile(result.p0ProfileId);
  if (result.p1ProfileId) touchProfile(result.p1ProfileId);
  return next;
}

export function clearProfileMatches(profileId: ProfileId): MatchResult[] {
  const filtered = loadMatches().filter((match) => match.p0ProfileId !== profileId && match.p1ProfileId !== profileId);
  saveMatches(filtered);
  return filtered;
}

export function exportMatches(): string {
  return JSON.stringify(loadMatches(), null, 2);
}

export function computeProfileStats(profileId: ProfileId, matches: MatchResult[]) {
  const relevant = matches.filter((match) => match.p0ProfileId === profileId || match.p1ProfileId === profileId);
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const byMode: Record<"cpu" | "human", { wins: number; losses: number }> = {
    cpu: { wins: 0, losses: 0 },
    human: { wins: 0, losses: 0 },
  };
  const byCpuPersonality: Record<string, { wins: number; losses: number }> = {};

  const sorted = [...relevant].sort((a, b) => a.ts - b.ts);
  for (const match of sorted) {
    const asPlayer = match.p0ProfileId === profileId ? 0 : 1;
    const won = match.winnerPlayer === asPlayer;
    if (won) {
      wins += 1;
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
    } else {
      losses += 1;
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    }
    if (Math.abs(currentStreak) > bestStreak) bestStreak = Math.abs(currentStreak);

    if (match.mode === "CPU") {
      if (won) byMode.cpu.wins += 1;
      else byMode.cpu.losses += 1;
      const key = match.cpuPersonality ?? "BALANCED";
      if (!byCpuPersonality[key]) byCpuPersonality[key] = { wins: 0, losses: 0 };
      if (won) byCpuPersonality[key].wins += 1;
      else byCpuPersonality[key].losses += 1;
    } else {
      if (won) byMode.human.wins += 1;
      else byMode.human.losses += 1;
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  return {
    total,
    wins,
    losses,
    winRate,
    currentStreak,
    bestStreak,
    byMode,
    byCpuPersonality,
  };
}
