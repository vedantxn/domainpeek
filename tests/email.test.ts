import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:dns/promises", () => ({ resolveTxt: vi.fn() }));

import { emailSecurity } from "../src/intel/email.js";
import { resolveTxt } from "node:dns/promises";

describe("emailSecurity", () => {
  beforeEach(() => vi.resetAllMocks());

  it("detects spf and dmarc policy", async () => {
    vi.mocked(resolveTxt).mockImplementation(async (name: string) =>
      name.startsWith("_dmarc.")
        ? [["v=DMARC1; p=reject; rua=mailto:x@y.com"]]
        : [["v=spf1 include:_spf.google.com ~all"]]
    );
    const r = await emailSecurity("example.com");
    expect(r.spf).toBe(true);
    expect(r.dmarc).toBe(true);
    expect(r.dmarc_policy).toBe("reject");
  });

  it("returns all-false when records absent", async () => {
    vi.mocked(resolveTxt).mockResolvedValue([]);
    const r = await emailSecurity("example.com");
    expect(r).toEqual({ spf: false, dmarc: false, dmarc_policy: null });
  });

  it("degrades on resolver error", async () => {
    vi.mocked(resolveTxt).mockRejectedValue(new Error("nx"));
    const r = await emailSecurity("example.com");
    expect(r.spf).toBe(false);
  });
});
