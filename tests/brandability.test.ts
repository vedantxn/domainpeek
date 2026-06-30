import { describe, it, expect } from "vitest";
import { brandability } from "../src/intel/brandability.js";

describe("brandability", () => {
  it("scores a short pronounceable name high", () => {
    const b = brandability("luna");
    expect(b.length).toBe(4);
    expect(b.pronounceable).toBe(true);
    expect(b.has_digits).toBe(false);
    expect(b.has_hyphen).toBe(false);
    expect(b.score).toBeGreaterThan(80);
  });

  it("penalizes hyphens and digits", () => {
    const b = brandability("my-app2");
    expect(b.has_hyphen).toBe(true);
    expect(b.has_digits).toBe(true);
    expect(b.score).toBeLessThan(80);
  });

  it("flags an unpronounceable string", () => {
    const b = brandability("xkcdzqprst");
    expect(b.pronounceable).toBe(false);
  });
});
