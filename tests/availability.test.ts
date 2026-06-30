import { describe, it, expect, vi, beforeEach } from "vitest";
import { dnsPreCheck } from "../src/availability/dns.js";

vi.mock("node:dns/promises", () => ({
  resolve: vi.fn(),
}));

describe("dnsPreCheck", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns likely_taken when NS records exist", async () => {
    const { resolve } = await import("node:dns/promises");
    vi.mocked(resolve).mockResolvedValue(["ns1.example.com", "ns2.example.com"] as any);

    const result = await dnsPreCheck("google.com");
    expect(result).toBe("likely_taken");
  });

  it("returns unknown when no NS records", async () => {
    const { resolve } = await import("node:dns/promises");
    vi.mocked(resolve).mockResolvedValue([] as any);

    const result = await dnsPreCheck("somethingrandom12345.com");
    expect(result).toBe("unknown");
  });

  it("returns unknown on DNS error", async () => {
    const { resolve } = await import("node:dns/promises");
    vi.mocked(resolve).mockRejectedValue(new Error("NXDOMAIN"));

    const result = await dnsPreCheck("nonexistent.xyz");
    expect(result).toBe("unknown");
  });
});
