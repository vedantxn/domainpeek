import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchRdapWithRetry,
  checkRdap,
  clearBootstrapCache,
  parseRegistration,
} from "../src/availability/rdap.js";

const bootstrapPayload = {
  services: [[["com"], ["https://rdap.example.com/"]]],
};

describe("fetchRdapWithRetry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries on 429 then returns success", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ status: 429 } as Response)
      .mockResolvedValueOnce({ status: 200 } as Response);

    const res = await fetchRdapWithRetry("https://rdap.example.com/domain/test.com");
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns 429 after max retries exhausted", async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 429 } as Response);

    const res = await fetchRdapWithRetry("https://rdap.example.com/domain/test.com", {
      maxRetries: 2,
    });
    expect(res.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("checkRdap", () => {
  beforeEach(() => {
    clearBootstrapCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearBootstrapCache();
  });

  it("returns available true on 404", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => bootstrapPayload,
      } as Response)
      .mockResolvedValueOnce({ status: 404 } as Response);

    const result = await checkRdap("available-name.com");
    expect(result).toEqual({
      available: true,
      premium: false,
      registration: null,
    });
  });

  it("returns taken with premium flag when status indicates premium", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => bootstrapPayload,
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ status: ["active", "premium"] }),
      } as Response);

    const result = await checkRdap("premium.com");
    expect(result.available).toBe(false);
    expect(result.premium).toBe(true);
  });

  it("returns null availability when TLD not in bootstrap", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ services: [] }),
    } as Response);

    const result = await checkRdap("test.unknowntld");
    expect(result).toEqual({
      available: null,
      premium: false,
      registration: null,
    });
  });

  it("populates registration intel for a taken domain", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => bootstrapPayload,
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          status: ["active"],
          events: [
            { eventAction: "registration", eventDate: "2020-06-30T00:00:00Z" },
            { eventAction: "expiration", eventDate: "2026-07-30T00:00:00Z" },
          ],
          entities: [
            {
              roles: ["registrar"],
              vcardArray: [
                "vcard",
                [
                  ["version", {}, "text", "4.0"],
                  ["fn", {}, "text", "Porkbun LLC"],
                ],
              ],
            },
          ],
          nameservers: [{ ldhName: "CURT.NS.CLOUDFLARE.COM" }],
          secureDNS: { delegationSigned: true },
        }),
      } as Response);

    const now = Date.parse("2026-06-30T00:00:00Z");
    const result = await checkRdap("taken.com", now);
    expect(result.available).toBe(false);
    expect(result.registration?.registrar).toBe("Porkbun LLC");
    expect(result.registration?.expires_in_days).toBe(30);
    expect(result.registration?.dnssec).toBe(true);
    expect(result.registration?.nameservers).toEqual(["CURT.NS.CLOUDFLARE.COM"]);
  });
});

describe("parseRegistration", () => {
  const NOW = Date.parse("2026-06-30T00:00:00Z");

  it("computes age/expiry and extracts fields", () => {
    const reg = parseRegistration(
      {
        status: ["active"],
        events: [
          { eventAction: "registration", eventDate: "2020-06-30T00:00:00Z" },
          { eventAction: "expiration", eventDate: "2026-07-30T00:00:00Z" },
          { eventAction: "last changed", eventDate: "2025-01-01T00:00:00Z" },
        ],
        entities: [
          {
            roles: ["registrar"],
            vcardArray: [
              "vcard",
              [
                ["version", {}, "text", "4.0"],
                ["fn", {}, "text", "Cloudflare, Inc."],
              ],
            ],
          },
        ],
        nameservers: [{ ldhName: "A.NS" }, { ldhName: "B.NS" }],
        secureDNS: { delegationSigned: false },
      },
      NOW
    );
    expect(reg.created_at).toBe("2020-06-30T00:00:00Z");
    expect(reg.updated_at).toBe("2025-01-01T00:00:00Z");
    expect(reg.registrar).toBe("Cloudflare, Inc.");
    expect(reg.expires_in_days).toBe(30);
    expect(reg.age_days).toBeGreaterThan(2189);
    expect(reg.age_days).toBeLessThan(2193);
    expect(reg.dnssec).toBe(false);
    expect(reg.nameservers).toEqual(["A.NS", "B.NS"]);
    expect(reg.dropping_soon).toBe(false);
  });

  it("flags dropping_soon for redemption / pending delete", () => {
    expect(
      parseRegistration({ status: ["redemption period"] }, NOW).dropping_soon
    ).toBe(true);
    expect(
      parseRegistration({ status: ["pending delete"] }, NOW).dropping_soon
    ).toBe(true);
    expect(
      parseRegistration({ status: ["pendingDelete"] }, NOW).dropping_soon
    ).toBe(true);
  });

  it("handles a sparse record", () => {
    const reg = parseRegistration({}, NOW);
    expect(reg.created_at).toBeNull();
    expect(reg.age_days).toBeNull();
    expect(reg.registrar).toBeNull();
    expect(reg.dnssec).toBeNull();
    expect(reg.nameservers).toEqual([]);
    expect(reg.dropping_soon).toBe(false);
  });
});
