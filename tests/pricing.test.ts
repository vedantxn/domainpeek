import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPricing } from "../src/pricing/index.js";

vi.mock("../src/pricing/cache.js", () => ({
  getPricingData: vi.fn(),
}));

describe("getPricing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns prices sorted cheapest-first for known TLD", async () => {
    const { getPricingData } = await import("../src/pricing/cache.js");
    vi.mocked(getPricingData).mockResolvedValue({
      data: {
        version: 1,
        updated_at: "2026-06-30T00:00:00Z",
        registrars: ["porkbun", "cloudflare"],
        tlds: {
          com: {
            prices: [
              { registrar: "cloudflare", year1_usd_cents: 1018, renewal_usd_cents: 1018, transfer_usd_cents: 1018, url: null, price_updated_at: "2026-06-30T00:00:00Z" },
              { registrar: "porkbun", year1_usd_cents: 1025, renewal_usd_cents: 1125, transfer_usd_cents: 1025, url: null, price_updated_at: "2026-06-30T00:00:00Z" },
            ],
          },
        },
      },
      stale: false,
    });

    const prices = await getPricing("com");
    expect(prices).toHaveLength(2);
    expect(prices[0].registrar).toBe("cloudflare");
    expect(prices[0].year1_usd_cents).toBe(1018);
    expect(prices[1].registrar).toBe("porkbun");
  });

  it("returns empty array for unknown TLD", async () => {
    const { getPricingData } = await import("../src/pricing/cache.js");
    vi.mocked(getPricingData).mockResolvedValue({
      data: { version: 1, updated_at: "", registrars: [], tlds: {} },
      stale: false,
    });

    const prices = await getPricing("unknowntld");
    expect(prices).toEqual([]);
  });

  it("returns empty array when no pricing data available", async () => {
    const { getPricingData } = await import("../src/pricing/cache.js");
    vi.mocked(getPricingData).mockResolvedValue({ data: null, stale: false });

    const prices = await getPricing("com");
    expect(prices).toEqual([]);
  });

  it("handles TLD with leading dot", async () => {
    const { getPricingData } = await import("../src/pricing/cache.js");
    vi.mocked(getPricingData).mockResolvedValue({
      data: {
        version: 1,
        updated_at: "",
        registrars: ["test"],
        tlds: {
          io: {
            prices: [
              { registrar: "test", year1_usd_cents: 3000, renewal_usd_cents: 5000, transfer_usd_cents: 3000, url: null, price_updated_at: "" },
            ],
          },
        },
      },
      stale: false,
    });

    const prices = await getPricing(".io");
    expect(prices).toHaveLength(1);
    expect(prices[0].registrar).toBe("test");
  });
});
