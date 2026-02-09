import { forwardRef } from "react";
import type { ReactNode } from "react";

type MenuProps = {
  children: ReactNode;
  align?: "left" | "right";
};

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  { children, align = "right" },
  ref
) {
  return (
    <div
      ref={ref}
      className="menuPopover"
      role="menu"
      style={align === "left" ? { left: 0 } : { right: 0 }}
    >
      {children}
    </div>
  );
});
