export interface DomainResult {
  domain: string;
  available: boolean | null;
  premium: boolean;
  checked_at: string;
  prices: RegistrarPrice[];
  cheapest: RegistrarPrice | null;
  tld_pricing: true;
  pricing_stale?: boolean;
  registration?: RegistrationIntel | null;
  dns?: DnsSignals | null;
  pricing_notes?: string[];
  email_security?: EmailSecurity | null;
  for_sale?: ForSale | null;
  tls?: TlsCert | null;
  web_history?: WebHistory | null;
  cert_history?: CertHistory | null;
}

export interface RegistrationIntel {
  created_at: string | null;
  expires_at: string | null;
  updated_at: string | null;
  age_days: number | null;
  expires_in_days: number | null;
  registrar: string | null;
  statuses: string[];
  dropping_soon: boolean;
  estimated_drop_at?: string | null;
  dnssec: boolean | null;
  nameservers: string[];
}

export interface EmailSecurity {
  spf: boolean;
  dmarc: boolean;
  dmarc_policy: string | null;
}

export interface ForSale {
  listed: boolean;
  marketplace: string | null;
}

export interface TlsCert {
  issuer: string | null;
  valid_from: string | null;
  valid_to: string | null;
  days_to_expiry: number | null;
  san_count: number;
  sample_sans: string[];
}

export interface WebHistory {
  first_seen: string | null;
  snapshot_count: number;
}

export interface CertHistory {
  subdomains_seen: number;
  sample: string[];
}

export interface BrandAvailability {
  npm: boolean | null;
  github: boolean | null;
}

export interface Brandability {
  score: number;
  length: number;
  pronounceable: boolean;
  has_digits: boolean;
  has_hyphen: boolean;
  dictionary_word: boolean;
  syllables: number;
}

export interface BrandResult {
  name: string;
  brand: BrandAvailability;
  brandability: Brandability;
}

export interface DefensiveVariant {
  variant: string;
  registered: boolean | null;
}

export interface DefensiveScanResult {
  name: string;
  variants: DefensiveVariant[];
}

export interface DnsSignals {
  has_website: boolean;
  has_email: boolean;
  parked: boolean | null;
  dns_provider: string | null;
  email_provider: string | null;
}

export interface BatchCheckResult {
  results: DomainResult[];
  errors?: { domain: string; reason: string }[];
}

export interface NameSearchResult {
  name: string;
  results: DomainResult[];
  available: DomainResult[];
  cheapest_available: DomainResult | null;
  brand?: BrandAvailability;
  brandability?: Brandability;
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
