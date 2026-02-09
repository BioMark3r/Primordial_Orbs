import React, { useId, useState } from "react";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
  placement?: TooltipPlacement;
};

export function Tooltip({ content, children, disabled = false, placement = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const childDisabled =
    React.isValidElement(children) &&
    Boolean((children.props as { disabled?: boolean | undefined }).disabled);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? tooltipId : undefined}
      tabIndex={childDisabled ? 0 : undefined}
    >
      {children}
      {open && (
        <span id={tooltipId} role="tooltip" className={`tooltip tooltip--${placement}`}>
          {content}
        </span>
      )}
    </span>
  );
}
