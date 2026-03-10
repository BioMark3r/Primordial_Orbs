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
});
