import type { RegistrationIntel } from "../types.js";

const RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";

const PREMIUM_STATUS_MARKERS = ["premium", "reserved", "allocated"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, unknown[]];
  publicIds?: { type?: string; identifier?: string }[];
}

interface RdapResponse {
  status?: string[];
  events?: { eventAction?: string; eventDate?: string }[];
  entities?: RdapEntity[];
  nameservers?: { ldhName?: string }[];
  secureDNS?: { delegationSigned?: boolean };
}

function eventDate(
  events: RdapResponse["events"],
  action: string
): string | null {
  const e = events?.find((ev) => ev.eventAction === action);
  return e?.eventDate ?? null;
}

function daysFrom(
  iso: string | null,
  now: number,
  dir: "since" | "until"
): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const diff = dir === "since" ? now - ms : ms - now;
  return Math.floor(diff / MS_PER_DAY);
}

function registrarName(entities: RdapEntity[] | undefined): string | null {
  const reg = entities?.find((e) => e.roles?.includes("registrar"));
  if (!reg) return null;
  const fields = reg.vcardArray?.[1];
  if (Array.isArray(fields)) {
    for (const f of fields) {
      if (Array.isArray(f) && f[0] === "fn" && typeof f[3] === "string") {
        return f[3];
      }
    }
  }
  const pid = reg.publicIds?.find((p) => /registrar/i.test(p.type ?? ""));
  return pid?.identifier ?? null;
}

export function parseRegistration(
  data: RdapResponse,
  now: number
): RegistrationIntel {
  const statuses = data.status ?? [];
  const created = eventDate(data.events, "registration");
  const expires = eventDate(data.events, "expiration");
  const updated = eventDate(data.events, "last changed");
  const normalized = statuses.map((s) => s.toLowerCase().replace(/\s+/g, ""));
  const dropping_soon = normalized.some(
    (s) => s === "redemptionperiod" || s === "pendingdelete"
  );
  return {
    created_at: created,
    expires_at: expires,
    updated_at: updated,
    age_days: daysFrom(created, now, "since"),
    expires_in_days: daysFrom(expires, now, "until"),
    registrar: registrarName(data.entities),
    statuses,
    dropping_soon,
    dnssec:
      typeof data.secureDNS?.delegationSigned === "boolean"
        ? data.secureDNS.delegationSigned
        : null,
    nameservers: (data.nameservers ?? [])
      .map((n) => n.ldhName)
      .filter((n): n is string => typeof n === "string"),
  };
}

let bootstrapCache: Record<string, string> | null = null;

async function getBootstrap(): Promise<Record<string, string>> {
  if (bootstrapCache) return bootstrapCache;

  const res = await fetch(RDAP_BOOTSTRAP_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch RDAP bootstrap: ${res.status}`);
  }

  const data = (await res.json()) as {
    services: [string[], string[]][];
  };

  const map: Record<string, string> = {};
  for (const [tlds, urls] of data.services) {
    const serverUrl = urls[0];
    for (const tld of tlds) {
      map[tld] = serverUrl.replace(/\/$/, "");
    }
  }

  bootstrapCache = map;
  return map;
}

function extractTld(domain: string): string {
  const parts = domain.split(".");
  if (parts.length < 2) throw new Error(`Invalid domain: ${domain}`);
  return parts.slice(1).join(".");
}

function isPremiumStatus(statuses: string[]): boolean {
  return statuses.some((status) =>
    PREMIUM_STATUS_MARKERS.some((marker) =>
      status.toLowerCase().includes(marker)
    )
  );
}

export async function fetchRdapWithRetry(
  url: string,
  options: { signal?: AbortSignal; maxRetries?: number } = {}
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  let delayMs = 500;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { signal: options.signal });

    if (res.status !== 429 || attempt === maxRetries) {
      return res;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs *= 2;
  }

  throw new Error("RDAP fetch failed after retries");
}

export async function checkRdap(
  domain: string,
  now: number = Date.now()
): Promise<{
  available: boolean | null;
  premium: boolean;
  registration: RegistrationIntel | null;
}> {
  const tld = extractTld(domain);

  let serverUrl: string;
  try {
    const bootstrap = await getBootstrap();
    serverUrl = bootstrap[tld];
    if (!serverUrl) {
      return { available: null, premium: false, registration: null };
    }
  } catch {
    return { available: null, premium: false, registration: null };
  }

  const url = `${serverUrl}/domain/${domain}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetchRdapWithRetry(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 404) {
      return { available: true, premium: false, registration: null };
    }

    if (!res.ok) {
      return { available: null, premium: false, registration: null };
    }

    const data = (await res.json()) as RdapResponse;

    const statuses = data.status || [];
    const premium = isPremiumStatus(statuses);
    const registration = parseRegistration(data, now);

    // A non-404 RDAP record means the domain exists (taken), regardless of
    // which lifecycle status it carries (active, redemption, pending delete).
    return { available: false, premium, registration };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { available: null, premium: false, registration: null };
    }
    return { available: null, premium: false, registration: null };
  }
}

export function clearBootstrapCache(): void {
  bootstrapCache = null;
}
