import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the splash screen on first load", () => {
    render(<App />);

    expect(screen.getByTestId("screen-splash")).toBeInTheDocument();
    expect(screen.getByText("PRIMORDIAL ORBS")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeDisabled();
  });
});
