export interface DomainResult {
  domain: string;
  available: boolean | null;
  premium: boolean;
  checked_at: string;
  prices: RegistrarPrice[];
  cheapest: RegistrarPrice | null;
  tld_pricing: true;
  pricing_stale?: boolean;
}

export interface BatchCheckResult {
  results: DomainResult[];
  errors?: { domain: string; reason: string }[];
}

export interface RegistrarPrice {
  registrar: string;
  year1_usd_cents: number;
  renewal_usd_cents: number;
  transfer_usd_cents: number | null;
  url: string | null;
  price_updated_at: string;
}

export interface PricingData {
  version: number;
  updated_at: string;
  registrars: string[];
  tlds: Record<string, TldPricing>;
}

export interface TldPricing {
  prices: RegistrarPrice[];
}
