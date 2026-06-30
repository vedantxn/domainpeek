import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { estimateDropDate, detectForSale } from "../src/intel/acquisition.js";

describe("estimateDropDate", () => {
  it("adds ~75 days to expiry", () => {
    const exp = "2026-01-01T00:00:00.000Z";
    const expected = new Date(
      Date.parse(exp) + 75 * 86400000
    ).toISOString();
    expect(estimateDropDate(exp)).toBe(expected);
  });

  it("returns null on missing/invalid", () => {
    expect(estimateDropDate(null)).toBeNull();
    expect(estimateDropDate("not-a-date")).toBeNull();
  });
});

describe("detectForSale", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("flags a marketplace lander", async () => {
    vi.mocked(fetch).mockResolvedValue({
      url: "https://dan.com/buy-domain/foo.com",
      text: async () => "<html>buy this domain</html>",
    } as unknown as Response);
    const r = await detectForSale("foo.com");
    expect(r.listed).toBe(true);
    expect(r.marketplace).toBe("Dan");
  });

  it("returns not-listed for a normal site", async () => {
    vi.mocked(fetch).mockResolvedValue({
      url: "https://foo.com",
      text: async () => "<html>welcome to foo</html>",
    } as unknown as Response);
    const r = await detectForSale("foo.com");
    expect(r.listed).toBe(false);
  });

  it("returns not-listed on fetch error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    const r = await detectForSale("foo.com");
    expect(r).toEqual({ listed: false, marketplace: null });
  });
});
