export type ColonizeType = "PLANT" | "ANIMAL" | "SENTIENT" | "HIGH_TECH";

export type ProgressState = {
  unlocked: Record<ColonizeType, boolean>;
  unlockedCount: number;
  hasAll: boolean;
};

const ALL_TYPES: ColonizeType[] = ["PLANT", "ANIMAL", "SENTIENT", "HIGH_TECH"];

export function computeProgressFromPlanet(planetSlots: any[]): ProgressState {
  const unlocked: Record<ColonizeType, boolean> = {
    PLANT: false,
    ANIMAL: false,
    SENTIENT: false,
    HIGH_TECH: false,
  };

  for (const slot of planetSlots) {
    if (slot?.kind === "COLONIZE") {
      unlocked[slot.c as ColonizeType] = true;
    }
  }

  const unlockedCount = ALL_TYPES.filter((type) => unlocked[type]).length;
  return {
    unlocked,
    unlockedCount,
    hasAll: unlockedCount === ALL_TYPES.length,
  };
}

export function diffProgress(prev: ProgressState, next: ProgressState): ColonizeType[] {
  return ALL_TYPES.filter((type) => !prev.unlocked[type] && next.unlocked[type]);
}
