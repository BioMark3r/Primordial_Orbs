import type { ReactNode } from "react";
import type { Orb } from "../../engine/types";

type IconProps = {
  children: ReactNode;
  viewBox?: string;
};

function SymbolSvg({ children, viewBox = "0 0 24 24" }: IconProps): ReactNode {
  return (
    <svg viewBox={viewBox} width="100%" height="100%" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

function terraformSymbol(type: Orb & { kind: "TERRAFORM" }): ReactNode {
  switch (type.t) {
    case "LAND":
      return (
        <SymbolSvg>
          <path d="M3 17h18" />
          <path d="M4.5 17 9 9.5 13 14" />
          <path d="M10.8 17 14.8 11 19.5 17" />
        </SymbolSvg>
      );
    case "WATER":
      return (
        <SymbolSvg>
          <path d="M3 9c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0" />
          <path d="M3 13c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0" />
          <path d="M3 17c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0" />
        </SymbolSvg>
      );
    case "ICE":
      return (
        <SymbolSvg>
          <path d="M12 4v16" />
          <path d="m5.5 8 13 8" />
          <path d="m5.5 16 13-8" />
          <path d="m12 4 1.8 1.8" />
          <path d="m12 4-1.8 1.8" />
          <path d="m12 20 1.8-1.8" />
          <path d="m12 20-1.8-1.8" />
        </SymbolSvg>
      );
    case "LAVA":
      return (
        <SymbolSvg>
          <path d="M6 17h12" />
          <path d="m8 17 4-9 4 9" />
          <path d="M12 8.5c-.4-1.5.4-2.8 1.4-4" />
          <path d="M10.5 10c-.4-1.1 0-2 .8-3" />
        </SymbolSvg>
      );
    case "GAS":
      return (
        <SymbolSvg>
          <path d="M12 4.2c-3.8 0-6.8 2.6-6.8 5.8 0 2.2 1.5 3.8 3.6 3.8 1.8 0 3.2-1.2 3.2-2.9 0-1.3-.9-2.2-2.1-2.2" />
          <path d="M13.2 10.5c2.3 0 4.2 1.8 4.2 4.1S15.6 19 13.3 19c-1.5 0-2.7-1-2.7-2.3" />
        </SymbolSvg>
      );
  }
}

function colonizeSymbol(type: Orb & { kind: "COLONIZE" }): ReactNode {
  switch (type.c) {
    case "PLANT":
      return (
        <SymbolSvg>
          <path d="M12 19v-9" />
          <path d="M12 12c-3.5 0-6.2-2.2-6.2-5.3 3.8 0 6.2 2.4 6.2 5.3Z" />
          <path d="M12 12c3.5 0 6.2-2.2 6.2-5.3-3.8 0-6.2 2.4-6.2 5.3Z" />
        </SymbolSvg>
      );
    case "ANIMAL":
      return (
        <SymbolSvg>
          <ellipse cx="12" cy="15.2" rx="3.2" ry="2.5" />
          <circle cx="8" cy="10.2" r="1.2" />
          <circle cx="10.6" cy="8.7" r="1.2" />
          <circle cx="13.4" cy="8.7" r="1.2" />
          <circle cx="16" cy="10.2" r="1.2" />
        </SymbolSvg>
      );
    case "SENTIENT":
      return (
        <SymbolSvg>
          <circle cx="12" cy="9" r="3.3" />
          <path d="M7.2 18.2c1.4-2.7 3-4.1 4.8-4.1s3.4 1.4 4.8 4.1" />
          <path d="M10.8 8.8h2.4" />
        </SymbolSvg>
      );
    case "HIGH_TECH":
      return (
        <SymbolSvg>
          <path d="M12 5.3 17.8 8.7v6.6L12 18.7 6.2 15.3V8.7Z" />
          <circle cx="12" cy="12" r="1.5" />
          <path d="M12 10.5V8" />
          <path d="M13.3 12.8 15.5 14" />
          <path d="M10.7 12.8 8.5 14" />
        </SymbolSvg>
      );
  }
}

function impactSymbol(type: Orb & { kind: "IMPACT" }): ReactNode {
  switch (type.i) {
    case "METEOR":
      return (
        <SymbolSvg>
          <circle cx="15.8" cy="14.6" r="2.8" />
          <path d="M5 7.5h6" />
          <path d="M6.8 10.7h4.9" />
          <path d="M9.4 13.9h3" />
        </SymbolSvg>
      );
    case "TORNADO":
      return (
        <SymbolSvg>
          <path d="M4.2 7.2h15.6" />
          <path d="M6 10.1h12" />
          <path d="M7.8 13h8.3" />
          <path d="M9.7 15.8h4.5" />
          <path d="M11.5 18.4h1" />
        </SymbolSvg>
      );
    case "QUAKE":
      return (
        <SymbolSvg>
          <path d="M5 8.2h6.5l-2.6 4.3h4.2l-2.2 3.3h7.1" />
          <path d="M7.2 17.8 9.4 15" />
          <path d="M14.3 12.8 16 10.6" />
        </SymbolSvg>
      );
    case "SOLAR_FLARE":
      return (
        <SymbolSvg>
          <circle cx="12" cy="12" r="3.3" />
          <path d="M12 4.3v2.1" />
          <path d="M12 17.6v2.1" />
          <path d="m19.7 12-2.1 0" />
          <path d="m6.4 12-2.1 0" />
          <path d="m17.3 6.7-1.5 1.5" />
          <path d="m8.2 15.8-1.5 1.5" />
          <path d="m17.3 17.3-1.5-1.5" />
          <path d="m8.2 8.2-1.5-1.5" />
        </SymbolSvg>
      );
    case "DISEASE":
      return (
        <SymbolSvg>
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="12" cy="7" r="2.2" />
          <circle cx="7.7" cy="14.4" r="2.2" />
          <circle cx="16.3" cy="14.4" r="2.2" />
        </SymbolSvg>
      );
    case "TEMPORAL_VORTEX":
      return (
        <SymbolSvg>
          <path d="M9 5.4h6" />
          <path d="M9.2 18.6h5.6" />
          <path d="M9.2 5.4c0 3.4 5.6 3.6 5.6 6.6 0 2.6-2.8 3.8-5.6 6.6" />
          <path d="M17.8 12c0 3.2-2.6 5.8-5.8 5.8" />
        </SymbolSvg>
      );
    case "BLACK_HOLE":
      return (
        <SymbolSvg>
          <ellipse cx="12" cy="12" rx="6.8" ry="4.2" />
          <circle cx="12" cy="12" r="1.3" />
          <path d="M6.8 9.5c1.4-1.5 3.1-2.3 5.2-2.3" />
        </SymbolSvg>
      );
  }
}

export function getOrbSymbol(orb: Orb): ReactNode {
  if (orb.kind === "TERRAFORM") return terraformSymbol(orb);
  if (orb.kind === "COLONIZE") return colonizeSymbol(orb);
  return impactSymbol(orb);
}
