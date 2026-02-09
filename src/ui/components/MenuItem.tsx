import type { ButtonHTMLAttributes, ReactNode } from "react";

type MenuItemProps = {
  children: ReactNode;
  onSelect?: () => void;
  tone?: "default" | "danger";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

export function MenuItem({ children, onSelect, tone = "default", ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      className={`menuItem${tone === "danger" ? " menuItem--danger" : ""}`}
      role="menuitem"
      onClick={onSelect}
      {...rest}
    >
      {children}
    </button>
  );
}
