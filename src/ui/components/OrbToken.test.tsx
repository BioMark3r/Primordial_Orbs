import { render, screen } from "@testing-library/react";
import { OrbToken } from "./OrbToken";

describe("OrbToken sprite mapping", () => {
  it("uses element-specific orb sprites", () => {
    render(
      <>
        <OrbToken orb={{ kind: "TERRAFORM", t: "LAVA" }} />
        <OrbToken orb={{ kind: "TERRAFORM", t: "ICE" }} />
        <OrbToken orb={{ kind: "TERRAFORM", t: "LAND" }} />
        <OrbToken orb={{ kind: "COLONIZE", c: "HIGH_TECH" }} />
      </>,
    );

    expect(screen.getByAltText("lava")).toHaveAttribute("src", expect.stringContaining("orb_lava.webp"));
    expect(screen.getByAltText("ice")).toHaveAttribute("src", expect.stringContaining("orb_ice.webp"));
    expect(screen.getByAltText("nature")).toHaveAttribute("src", expect.stringContaining("orb_nature.webp"));
    expect(screen.getByAltText("void")).toHaveAttribute("src", expect.stringContaining("orb_void.webp"));
  });
  it("renders a dedicated symbol layer above orb background", () => {
    const { container } = render(<OrbToken orb={{ kind: "TERRAFORM", t: "LAND" }} size="slot" />);

    const orb = container.querySelector(".orb");
    expect(orb).toBeTruthy();
    expect(orb?.querySelector(".orb__bg .orb-icon img")).toBeTruthy();

    const symbolWrap = orb?.querySelector(".orb__symbol-wrap");
    const symbol = orb?.querySelector(".orb__symbol");
    expect(symbolWrap).toBeTruthy();
    expect(symbol).toBeTruthy();
    expect(symbol?.querySelector("svg")).toBeTruthy();
  });

});
