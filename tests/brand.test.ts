import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { brandAvailability } from "../src/intel/brand.js";

describe("brandAvailability", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("maps 404=available, 200=taken", async () => {
    vi.mocked(fetch).mockImplementation(async (url: unknown) => {
      const u = String(url);
      return u.includes("registry.npmjs.org")
        ? ({ status: 404, ok: false } as Response)
        : ({ status: 200, ok: true } as Response);
    });
    const r = await brandAvailability("somename");
    expect(r.npm).toBe(true);
    expect(r.github).toBe(false);
  });

  it("returns null on rate-limit / unexpected status", async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 403, ok: false } as Response);
    const r = await brandAvailability("x");
    expect(r).toEqual({ npm: null, github: null });
  });

  it("returns null on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    const r = await brandAvailability("x");
    expect(r).toEqual({ npm: null, github: null });
  });
});
