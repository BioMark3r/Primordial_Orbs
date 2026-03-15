import type { ButtonHTMLAttributes, ReactNode } from "react";
import { playSfx } from "../../audio/audioManager";

type MenuItemProps = {
  children: ReactNode;
  onSelect?: () => void;
  tone?: "default" | "danger";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

export function MenuItem({ children, onSelect, tone = "default", ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      className={`menuItem ui-menuItem${tone === "danger" ? " menuItem--danger" : ""}`}
      role="menuitem"
      onClick={() => {
        playSfx("click", { volumeMul: 0.45 });
        onSelect?.();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
