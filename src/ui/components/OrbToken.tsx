import React from "react";
import type { Orb } from "../../engine/types";
import { orbIcon } from "../theme/assets";

type Size = "sm" | "md" | "lg" | "slot";

const px: Record<Size, number | string> = { sm: 34, md: 52, lg: 74, slot: "var(--slot)" };

function orbColorClass(orb: Orb): string {
  const slug = (value: string) => value.toLowerCase().replace(/_/g, "-");
  if (orb.kind === "TERRAFORM") return `marble--terraform-${slug(orb.t)}`;
  if (orb.kind === "COLONIZE") return `marble--colonize-${slug(orb.c)}`;
  return `marble--impact-${slug(orb.i)}`;
}

export function OrbToken(props: {
  orb: Orb;
  size?: Size;
  selected?: boolean;
  disabled?: boolean;
  actionable?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const size = props.size ?? "md";
  const d = px[size];
  const icon = orbIcon(props.orb);

  const cls = [
    "marble",
    orbColorClass(props.orb),
    props.selected ? "marble-selected" : "",
    props.disabled ? "marble-disabled" : "",
    props.actionable ? "marble-actionable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isImpact = props.orb.kind === "IMPACT";
  const isButton = Boolean(props.onClick);
  const Component = (isButton ? "button" : "div") as "button" | "div";

  const sharedProps = {
    className: cls,
    style: {
      width: d,
      height: d,
      padding: 0,
      background: "transparent",
      cursor: props.onClick ? "pointer" : "default",
    } as React.CSSProperties,
    title: props.title,
  };

  if (Component === "button") {
    return (
      <button
        type="button"
        {...sharedProps}
        onClick={props.onClick}
        disabled={props.disabled}
      >
        <span className={`etch${isImpact ? " etch-impact" : ""}`}>
          <img src={icon} alt="" />
        </span>
      </button>
    );
  }

  return (
    <div {...sharedProps}>
      <span className={`etch${isImpact ? " etch-impact" : ""}`}>
        <img src={icon} alt="" />
      </span>
    </div>
  );
}
