import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the How to Play control", () => {
    render(<App />);
    expect(screen.getAllByText("How to Play")[0]).toBeInTheDocument();
  });
});
