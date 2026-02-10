import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Menu } from "./Menu";
import { useClickOutside } from "../hooks/useClickOutside";

type MenuButtonProps = {
  label: string;
  testId?: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: "left" | "right";
  children: ReactNode;
};

export function MenuButton({ label, testId, open, onToggle, onClose, align = "right", children }: MenuButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const refs = useMemo(() => [buttonRef, menuRef], []);

  const handleOutside = useCallback(() => {
    if (open) onClose();
  }, [onClose, open]);

  useClickOutside(refs, handleOutside, open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <div className="menuButtonWrap">
      <button
        type="button"
        ref={buttonRef}
        data-testid={testId}
        className="menuButton"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <Menu ref={menuRef} align={align}>
          {children}
        </Menu>
      )}
    </div>
  );
}
