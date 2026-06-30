import { checkAvailability } from "./availability/index.js";
import { getPricing, getPricedTlds } from "./pricing/index.js";
import { brandAvailability } from "./intel/brand.js";
import { brandability } from "./intel/brandability.js";
import { emailSecurity } from "./intel/email.js";
import { tlsCert } from "./intel/tls.js";
import { detectForSale, estimateDropDate } from "./intel/acquisition.js";
import { waybackHistory, certHistory } from "./intel/history.js";
import { defensiveVariants } from "./intel/defensive.js";
import type {
  BatchCheckResult,
  BrandResult,
  DefensiveScanResult,
  DefensiveVariant,
  DomainResult,
  NameSearchResult,
  RegistrarPrice,
} from "./types.js";

export type {
  DomainResult,
  RegistrarPrice,
  PricingData,
  TldPricing,
  BatchCheckResult,
  RegistrationIntel,
  DnsSignals,
  NameSearchResult,
  BrandResult,
  BrandAvailability,
  Brandability,
  TlsCert,
  EmailSecurity,
  ForSale,
  WebHistory,
  CertHistory,
  DefensiveScanResult,
  DefensiveVariant,
} from "./types.js";

function validateBareName(name: string): string {
  const cleaned = name.trim().toLowerCase();
  if (!cleaned || cleaned.includes(".") || !/^[a-z0-9-]+$/.test(cleaned)) {
    throw new Error("Provide a bare name without a dot (e.g. mycoolname)");
  }
  return cleaned;
}

const MAX_CONCURRENT_CHECKS = 5;

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
  if (!/^[a-z0-9.-]+$/.test(cleaned))
    return "domain contains invalid characters (ASCII only)";
  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        const value = await fn(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function pricingNotes(cheapest: RegistrarPrice | null): string[] {
  if (!cheapest) return [];
  const notes: string[] = [];
  const { year1_usd_cents: y1, renewal_usd_cents: ren } = cheapest;
  if (y1 > 0 && ren > y1 * 1.25) {
    const pct = Math.round(((ren - y1) / y1) * 100);
    notes.push(
      `renewal ~${pct}% higher than first year at ${cheapest.registrar}`
    );
  }
  return notes;
}

async function gatherExtraIntel(domain: string, deep: boolean) {
  const [email_security, for_sale] = await Promise.all([
    emailSecurity(domain),
    detectForSale(domain),
  ]);
  if (!deep) {
    return { email_security, for_sale, tls: null, web_history: null, cert_history: null };
  }
  const [tls, web_history, cert_history] = await Promise.all([
    tlsCert(domain),
    waybackHistory(domain),
    certHistory(domain),
  ]);
  return { email_security, for_sale, tls, web_history, cert_history };
}

export async function checkDomain(
  domain: string,
  opts: { intel?: boolean; deep?: boolean } = {}
): Promise<DomainResult> {
  const error = validateDomain(domain);
  if (error) throw new Error(error);

  const normalized = domain.trim().toLowerCase();
  const tld = extractTld(normalized);

  const avail = await checkAvailability(normalized, { intel: opts.intel });
  const { available, premium } = avail;
  const { prices, stale } =
    available === true ? await getPricing(tld) : { prices: [], stale: false };
  const cheapest = prices.length > 0 ? prices[0] : null;
  const notes = pricingNotes(cheapest);

  const result: DomainResult = {
    domain: normalized,
    available,
    premium,
    checked_at: new Date().toISOString(),
    prices,
    cheapest,
    tld_pricing: true,
  };
  if (stale) result.pricing_stale = true;
  if (notes.length) result.pricing_notes = notes;

  // Intel only adds value for existing domains (taken or unknown); available
  // names have nothing to inspect, so we skip the DNS/web noise there.
  if (opts.intel && available !== true) {
    if (avail.registration) {
      avail.registration.estimated_drop_at = estimateDropDate(
        avail.registration.expires_at
      );
      result.registration = avail.registration;
    }
    if (avail.dns) result.dns = avail.dns;

    const extra = await gatherExtraIntel(normalized, Boolean(opts.deep));
    result.email_security = extra.email_security;
    result.for_sale = extra.for_sale;
    if (opts.deep) {
      result.tls = extra.tls;
      result.web_history = extra.web_history;
      result.cert_history = extra.cert_history;
    }
  }

  return result;
}

export async function searchName(
  name: string,
  tlds?: string[]
): Promise<NameSearchResult> {
  const cleaned = validateBareName(name);

  const requested = tlds && tlds.length ? tlds : await getPricedTlds();
  const tldList = requested.map((t) => t.replace(/^\./, "").toLowerCase());
  if (tldList.length === 0) {
    throw new Error("No TLDs available to search");
  }

  const [settled, brand] = await Promise.all([
    mapWithConcurrency(tldList, MAX_CONCURRENT_CHECKS, (tld) =>
      checkDomain(`${cleaned}.${tld}`)
    ),
    brandAvailability(cleaned),
  ]);

  const results: DomainResult[] = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          domain: `${cleaned}.${tldList[i]}`,
          available: null,
          premium: false,
          checked_at: new Date().toISOString(),
          prices: [],
          cheapest: null,
          tld_pricing: true,
        }
  );

  const available = results.filter((r) => r.available === true);
  const priced = available.filter((r) => r.cheapest !== null);
  const cheapest_available =
    priced.length > 0
      ? priced.reduce((min, r) =>
          r.cheapest!.year1_usd_cents < min.cheapest!.year1_usd_cents ? r : min
        )
      : (available[0] ?? null);

  return {
    name: cleaned,
    results,
    available,
    cheapest_available,
    brand,
    brandability: brandability(cleaned),
  };
}

export async function brandCheck(name: string): Promise<BrandResult> {
  const cleaned = validateBareName(name);
  const brand = await brandAvailability(cleaned);
  return { name: cleaned, brand, brandability: brandability(cleaned) };
}

export async function defensiveScan(
  name: string,
  tlds?: string[]
): Promise<DefensiveScanResult> {
  const cleaned = validateBareName(name);
  const requested = tlds && tlds.length ? tlds : await getPricedTlds();
  const tldList = requested.map((t) => t.replace(/^\./, "").toLowerCase());
  const variants = defensiveVariants(cleaned, tldList);

  const settled = await mapWithConcurrency(
    variants,
    MAX_CONCURRENT_CHECKS,
    (d) => checkDomain(d)
  );

  const out: DefensiveVariant[] = settled.map((r, i) => {
    if (r.status !== "fulfilled") return { variant: variants[i], registered: null };
    const a = r.value.available;
    return {
      variant: variants[i],
      registered: a === false ? true : a === true ? false : null,
    };
  });

  return { name: cleaned, variants: out };
}

export async function checkDomains(
  domains: string[]
): Promise<BatchCheckResult> {
  if (domains.length > 10) {
    throw new Error("Maximum 10 domains per batch query");
  }

  const settled = await mapWithConcurrency(
    domains,
    MAX_CONCURRENT_CHECKS,
    (d) => checkDomain(d)
  );

  const results: DomainResult[] = [];
  const errors: { domain: string; reason: string }[] = [];

  settled.forEach((r, i) => {
    const domain = domains[i].trim().toLowerCase();
    if (r.status === "fulfilled") {
      results.push(r.value);
    } else {
      const reason =
        r.reason instanceof Error ? r.reason.message : "Unknown error";
      errors.push({ domain, reason });
      results.push({
        domain,
        available: null,
        premium: false,
        checked_at: new Date().toISOString(),
        prices: [],
        cheapest: null,
        tld_pricing: true,
      });
    }
  });

  return {
    results,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

export { getPricing } from "./pricing/index.js";
export { checkAvailability } from "./availability/index.js";
