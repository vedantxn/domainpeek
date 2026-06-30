import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:dns/promises", () => ({
  resolve: vi.fn(),
  resolve4: vi.fn(),
  resolve6: vi.fn(),
  resolveMx: vi.fn(),
  resolveNs: vi.fn(),
}));

import { dnsSignals } from "../src/availability/dns.js";
import { resolve4, resolve6, resolveMx, resolveNs } from "node:dns/promises";

describe("dnsSignals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("detects website, email, and providers", async () => {
    vi.mocked(resolve4).mockResolvedValue(["1.2.3.4"]);
    vi.mocked(resolve6).mockResolvedValue([]);
    vi.mocked(resolveMx).mockResolvedValue([
      { exchange: "aspmx.l.google.com", priority: 1 },
    ]);
    vi.mocked(resolveNs).mockResolvedValue([
      "dana.ns.cloudflare.com",
      "rob.ns.cloudflare.com",
    ]);

    const s = await dnsSignals("example.com");
    expect(s.has_website).toBe(true);
    expect(s.has_email).toBe(true);
    expect(s.dns_provider).toBe("Cloudflare");
    expect(s.email_provider).toBe("Google Workspace");
    expect(s.parked).toBe(false);
  });

  it("flags a parked domain with no usage", async () => {
    vi.mocked(resolve4).mockRejectedValue(new Error("ENOTFOUND"));
    vi.mocked(resolve6).mockRejectedValue(new Error("ENOTFOUND"));
    vi.mocked(resolveMx).mockRejectedValue(new Error("ENOTFOUND"));
    vi.mocked(resolveNs).mockResolvedValue(["ns1.sedoparking.com"]);

    const s = await dnsSignals("parked-example.com");
    expect(s.has_website).toBe(false);
    expect(s.has_email).toBe(false);
    expect(s.parked).toBe(true);
  });

  it("returns parked null when there are no NS records", async () => {
    vi.mocked(resolve4).mockResolvedValue([]);
    vi.mocked(resolve6).mockResolvedValue([]);
    vi.mocked(resolveMx).mockResolvedValue([]);
    vi.mocked(resolveNs).mockResolvedValue([]);

    const s = await dnsSignals("nothing.com");
    expect(s.parked).toBeNull();
    expect(s.dns_provider).toBeNull();
    expect(s.email_provider).toBeNull();
  });
});
