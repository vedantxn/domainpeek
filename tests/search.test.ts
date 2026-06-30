import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/availability/index.js", () => ({
  checkAvailability: vi.fn(),
}));
vi.mock("../src/pricing/index.js", () => ({
  getPricing: vi.fn(),
  getPricedTlds: vi.fn(),
}));
// Avoid real npm/GitHub network calls during searchName.
vi.mock("../src/intel/brand.js", () => ({
  brandAvailability: vi.fn(async () => ({ npm: null, github: null })),
}));

import { searchName } from "../src/index.js";
import { checkAvailability } from "../src/availability/index.js";
import { getPricing, getPricedTlds } from "../src/pricing/index.js";

function price(cents: number) {
  return {
    prices: [
      {
        registrar: "porkbun",
        year1_usd_cents: cents,
        renewal_usd_cents: cents,
        transfer_usd_cents: cents,
        url: null,
        price_updated_at: "",
      },
    ],
    stale: false,
  };
}

describe("searchName", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns available subset and cheapest across TLDs", async () => {
    vi.mocked(getPricedTlds).mockResolvedValue(["com", "io", "dev"]);
    vi.mocked(checkAvailability).mockImplementation(async (domain: string) =>
      domain.endsWith(".com")
        ? { available: false, premium: false }
        : { available: true, premium: false }
    );
    vi.mocked(getPricing).mockImplementation(async (tld: string) =>
      tld === "io" ? price(3000) : tld === "dev" ? price(1200) : price(0)
    );

    const res = await searchName("mycoolname");
    expect(res.results).toHaveLength(3);
    expect(res.available.map((r) => r.domain).sort()).toEqual([
      "mycoolname.dev",
      "mycoolname.io",
    ]);
    expect(res.cheapest_available?.domain).toBe("mycoolname.dev");
  });

  it("uses the requested TLD subset when provided", async () => {
    vi.mocked(checkAvailability).mockResolvedValue({
      available: true,
      premium: false,
    });
    vi.mocked(getPricing).mockResolvedValue(price(999));

    const res = await searchName("brandname", ["com", ".net"]);
    expect(res.results.map((r) => r.domain).sort()).toEqual([
      "brandname.com",
      "brandname.net",
    ]);
    expect(getPricedTlds).not.toHaveBeenCalled();
  });

  it("rejects a name containing a dot", async () => {
    await expect(searchName("foo.com")).rejects.toThrow("bare name");
  });
});
