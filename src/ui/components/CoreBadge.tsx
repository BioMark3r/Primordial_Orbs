import React from "react";
import type { Core } from "../../engine/types";
import { coreIcon } from "../theme/assets";
import { orbColors } from "../theme/orbColors";

const coreColors: Record<Core, string> = {
  LAND: orbColors.TERRAFORM_LAND.base,
  WATER: orbColors.TERRAFORM_WATER.base,
  ICE: orbColors.TERRAFORM_ICE.base,
  LAVA: orbColors.TERRAFORM_LAVA.base,
  GAS: orbColors.TERRAFORM_GAS.base,
};

export function CoreBadge(props: { core: Core; size?: number; title?: string }) {
  const s = props.size ?? 28;
  const iconStyle: React.CSSProperties = {
    width: s,
    height: s,
    backgroundColor: coreColors[props.core],
    maskImage: `url(${coreIcon[props.core]})`,
    maskRepeat: "no-repeat",
    maskPosition: "center",
    maskSize: "contain",
    WebkitMaskImage: `url(${coreIcon[props.core]})`,
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    WebkitMaskSize: "contain",
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} title={props.title}>
      <span aria-hidden style={iconStyle} />
      <span style={{ fontWeight: 800, letterSpacing: 1 }}>{props.core}</span>
    </span>
  );
}
