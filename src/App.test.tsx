import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the splash screen on first load", () => {
    render(<App />);
    expect(screen.getByText("PRIMORDIAL ORBS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter the Cataclysm Arena" })).toBeInTheDocument();
  });
});
