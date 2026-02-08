const KEY = "primordial_orbs_tutorial_seen_v1";

export function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markSeenTutorial(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // ignore storage failures
  }
}

export function resetSeenTutorial(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore storage failures
  }
}
