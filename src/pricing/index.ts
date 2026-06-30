import type { RegistrarPrice } from "../types.js";
import { getPricingData } from "./cache.js";

export async function getPricing(
  tld: string
): Promise<{ prices: RegistrarPrice[]; stale: boolean }> {
  const { data, stale } = await getPricingData();
  if (!data) return { prices: [], stale: false };

  const normalized = tld.replace(/^\./, "").toLowerCase();
  const tldData = data.tlds[normalized];
  if (!tldData) return { prices: [], stale };

  const prices = [...tldData.prices].sort(
    (a, b) => a.year1_usd_cents - b.year1_usd_cents
  );
  return { prices, stale };
}

/** TLDs we have pricing for; used as the default set for multi-TLD search. */
export async function getPricedTlds(): Promise<string[]> {
  const { data } = await getPricingData();
  if (!data) return [];
  return Object.keys(data.tlds).sort();
}

export { getPricingData } from "./cache.js";
