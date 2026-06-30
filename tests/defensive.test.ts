import { describe, it, expect } from "vitest";
import { typoVariants, defensiveVariants } from "../src/intel/defensive.js";

describe("typoVariants", () => {
  it("generates omission/swap/double and excludes the original", () => {
    const v = typoVariants("abc");
    expect(v).not.toContain("abc");
    expect(v).toContain("bc"); // omission of 'a'
    expect(v).toContain("bac"); // swap a,b
    expect(v).toContain("aabc"); // double 'a'
    expect(v.every((x) => /^[a-z0-9-]+$/.test(x))).toBe(true);
  });
});

describe("defensiveVariants", () => {
  it("includes exact name across TLDs plus typos, bounded", () => {
    const v = defensiveVariants("brand", ["com", "net"], "com", 50);
    expect(v).toContain("brand.com");
    expect(v).toContain("brand.net");
    expect(v.some((d) => d.endsWith(".com") && d !== "brand.com")).toBe(true);
    expect(v.length).toBeLessThanOrEqual(50);
  });
});
