import { checkAvailability } from "./availability/index.js";
import { getPricing } from "./pricing/index.js";
import type { DomainResult, RegistrarPrice } from "./types.js";

export type { DomainResult, RegistrarPrice, PricingData, TldPricing } from "./types.js";

function extractTld(domain: string): string {
  const parts = domain.split(".");
  if (parts.length < 2) throw new Error(`Invalid domain: ${domain}`);
  return parts.slice(1).join(".");
}

function validateDomain(domain: string): string | null {
  const cleaned = domain.trim().toLowerCase();
  if (!cleaned) return "empty domain";
  if (cleaned.includes(" ")) return "domain contains spaces";
  const parts = cleaned.split(".");
  if (parts.length < 2) return "domain must have at least one dot";
  if (parts.some((p) => p.length === 0)) return "domain has empty label";
  if (!/^[a-z0-9.-]+$/.test(cleaned)) return "domain contains invalid characters (ASCII only)";
  return null;
}

export async function checkDomain(domain: string): Promise<DomainResult> {
  const error = validateDomain(domain);
  if (error) throw new Error(error);

  const normalized = domain.trim().toLowerCase();
  const tld = extractTld(normalized);

  const { available, premium } = await checkAvailability(normalized);
  const prices = available === false ? [] : await getPricing(tld);
  const cheapest = prices.length > 0 ? prices[0] : null;

  return {
    domain: normalized,
    available,
    premium,
    checked_at: new Date().toISOString(),
    prices,
    cheapest,
    tld_pricing: true,
  };
}

export async function checkDomains(domains: string[]): Promise<DomainResult[]> {
  if (domains.length > 10) {
    throw new Error("Maximum 10 domains per batch query");
  }

  const results = await Promise.allSettled(
    domains.map((d) => checkDomain(d))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      domain: domains[i].trim().toLowerCase(),
      available: null,
      premium: false,
      checked_at: new Date().toISOString(),
      prices: [],
      cheapest: null,
      tld_pricing: true as const,
    };
  });
}

export { getPricing } from "./pricing/index.js";
export { checkAvailability } from "./availability/index.js";
