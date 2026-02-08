import React from "react";
import type { Core } from "../../engine/types";
import { coreIcon } from "../theme/assets";

export function CoreBadge(props: { core: Core; size?: number; title?: string }) {
  const s = props.size ?? 28;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} title={props.title}>
      <img src={coreIcon[props.core]} alt="" style={{ width: s, height: s, opacity: 0.9 }} />
      <span style={{ fontWeight: 800, letterSpacing: 1 }}>{props.core}</span>
    </span>
  );
}
