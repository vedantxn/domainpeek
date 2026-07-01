import { describe, it, expect } from "vitest";
import { checkoutUrl } from "../src/checkout.js";

describe("checkoutUrl", () => {
  it("builds a Porkbun search/checkout deep link", () => {
    expect(checkoutUrl("porkbun", "foo.dev")).toBe(
      "https://porkbun.com/checkout/search?q=foo.dev"
    );
  });

  it("returns null for a registrar with no known deep link", () => {
    expect(checkoutUrl("cloudflare", "foo.dev")).toBeNull();
  });
});
