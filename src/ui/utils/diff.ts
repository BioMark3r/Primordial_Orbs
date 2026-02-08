export type SlotKey = string;

export function orbKey(orb: any): string {
  if (!orb) return "∅";
  if (orb.kind === "TERRAFORM") return `T:${orb.t}`;
  if (orb.kind === "COLONIZE") return `C:${orb.c}`;
  if (orb.kind === "IMPACT") return `I:${orb.i}`;
  return "<?>";
}

export function diffSlots(before: any[], after: any[]): number[] {
  const n = Math.min(before.length, after.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (orbKey(before[i]) !== orbKey(after[i])) out.push(i);
  }
  return out;
}

export function diffPlayersPlanets(
  beforeP0: any[],
  afterP0: any[],
  beforeP1: any[],
  afterP1: any[],
): { p0: number[]; p1: number[] } {
  return {
    p0: diffSlots(beforeP0, afterP0),
    p1: diffSlots(beforeP1, afterP1),
  };
}
