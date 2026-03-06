import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./hoverLimiter";

describe("createRateLimiter", () => {
  it("blocks repeated calls inside the interval", () => {
    const allow = createRateLimiter(200);

    expect(allow(1000)).toBe(true);
    expect(allow(1100)).toBe(false);
    expect(allow(1199)).toBe(false);
    expect(allow(1200)).toBe(true);
  });
});
