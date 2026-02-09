export function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return el.isContentEditable;
}

export type ShortcutContext = {
  canDraw: boolean;
  canEndPlay: boolean;
  canAdvance: boolean;
  canUndo: boolean;
  toggleLog: () => void;
  openTutorial: () => void;
  clearSelection: () => void;
  onDraw: () => void;
  onEndPlay: () => void;
  onAdvance: () => void;
  onUndo: () => void;
};

export function handleKeyDown(e: KeyboardEvent, ctx: ShortcutContext): void {
  if (isTypingTarget(e.target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const key = e.key.toLowerCase();
  let handled = true;

  switch (key) {
    case "d":
      if (ctx.canDraw) ctx.onDraw();
      else handled = false;
      break;
    case "e":
      if (ctx.canEndPlay) ctx.onEndPlay();
      else handled = false;
      break;
    case "a":
      if (ctx.canAdvance) ctx.onAdvance();
      else handled = false;
      break;
    case "u":
      if (ctx.canUndo) ctx.onUndo();
      else handled = false;
      break;
    case "l":
      ctx.toggleLog();
      break;
    case "?":
      ctx.openTutorial();
      break;
    case "/":
      if (e.shiftKey) ctx.openTutorial();
      else handled = false;
      break;
    case "escape":
      ctx.clearSelection();
      break;
    default:
      handled = false;
  }

  if (handled) e.preventDefault();
}
