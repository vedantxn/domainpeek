import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waybackHistory, certHistory } from "../src/intel/history.js";

describe("history (best-effort)", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("wayback parses CDX rows", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [["timestamp"], ["20140312000000"], ["20200101000000"]],
    } as unknown as Response);
    const r = await waybackHistory("x.com");
    expect(r?.first_seen).toBe("2014-03-12");
    expect(r?.snapshot_count).toBe(2);
  });

  it("wayback returns null on 502", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 502 } as Response);
    expect(await waybackHistory("x.com")).toBeNull();
  });

  it("certHistory counts subdomains, excluding apex + wildcard", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [{ name_value: "a.x.com\nx.com\n*.x.com" }],
    } as unknown as Response);
    const r = await certHistory("x.com");
    expect(r?.subdomains_seen).toBe(1);
    expect(r?.sample).toContain("a.x.com");
  });

  it("certHistory returns null when crt.sh is down", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 502 } as Response);
    expect(await certHistory("x.com")).toBeNull();
  });
});
