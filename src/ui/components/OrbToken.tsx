import React, { useEffect, useRef } from "react";
import type { Orb } from "../../engine/types";
import { drawOrb, orbStyleForOrb } from "../render/orbRenderer";

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
  disabledReason?: string;
  actionable?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const size = props.size ?? "md";
  const d = px[size];
  const numericSize = typeof d === "string" ? 62 : d;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let lastDimension = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const dimension = parent?.clientWidth || numericSize;
      if (dimension <= 0) return;
      const scale = window.devicePixelRatio || 1;
      if (dimension !== lastDimension || canvas.width !== dimension * scale) {
        canvas.width = dimension * scale;
        canvas.height = dimension * scale;
        canvas.style.width = `${dimension}px`;
        canvas.style.height = `${dimension}px`;
        lastDimension = dimension;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, dimension, dimension);
      const r = dimension * 0.46;
      drawOrb(ctx, dimension / 2, dimension / 2, r, orbStyleForOrb(props.orb), performance.now() / 1000);
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [numericSize, props.orb]);

  const cls = [
    "marble",
    orbColorClass(props.orb),
    props.selected ? "marble-selected" : "",
    props.disabled ? "marble-disabled" : "",
    props.actionable ? "marble-actionable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isButton = Boolean(props.onClick);
  const Component = (isButton ? "button" : "div") as "button" | "div";

  const sharedProps = {
    className: cls,
    style: {
      width: d,
      height: d,
      padding: 0,
      background: "transparent",
      cursor: props.disabled ? "not-allowed" : props.onClick ? "pointer" : "default",
    } as React.CSSProperties,
    title: props.title ?? props.disabledReason,
  };

  if (Component === "button") {
    const isDisabled = Boolean(props.disabled);
    return (
      <button
        type="button"
        {...sharedProps}
        onClick={isDisabled ? undefined : props.onClick}
        disabled={isDisabled && !props.disabledReason}
        aria-disabled={isDisabled || undefined}
      >
        <canvas ref={canvasRef} className="orb-canvas" width={numericSize} height={numericSize} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div {...sharedProps} aria-disabled={props.disabled || undefined}>
      <canvas ref={canvasRef} className="orb-canvas" width={numericSize} height={numericSize} aria-hidden="true" />
    </div>
  );
}
