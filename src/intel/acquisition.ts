import type { ForSale } from "../types.js";

// After a domain expires, registries run ~30-45d auto-renew grace + 30d
// redemption + 5d pending-delete before it drops. ~75 days is a sane estimate.
const DROP_LIFECYCLE_DAYS = 75;

export function estimateDropDate(expires_at: string | null): string | null {
  if (!expires_at) return null;
  const ms = Date.parse(expires_at);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + DROP_LIFECYCLE_DAYS * 86400000).toISOString();
}

const MARKETPLACES: { match: string; name: string }[] = [
  { match: "dan.com", name: "Dan" },
  { match: "afternic", name: "Afternic" },
  { match: "sedo", name: "Sedo" },
  { match: "hugedomains", name: "HugeDomains" },
  { match: "huge domains", name: "HugeDomains" },
  { match: "buy this domain", name: "marketplace lander" },
  { match: "this domain is for sale", name: "marketplace lander" },
  { match: "the domain is for sale", name: "marketplace lander" },
  { match: "domain for sale", name: "marketplace lander" },
];

/**
 * Heuristic: fetch the domain and look for a known marketplace lander in the
 * final URL or page body. Keyless; not a listing API, so it can miss/false-positive.
 */
export async function detectForSale(domain: string): Promise<ForSale> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://${domain}`, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "domainpeek" },
    });
    clearTimeout(timeout);

    let finalHost = "";
    try {
      finalHost = new URL(res.url).hostname.toLowerCase();
    } catch {
      finalHost = "";
    }
    const body = (await res.text()).slice(0, 4000).toLowerCase();
    const hay = `${finalHost} ${body}`;

    for (const m of MARKETPLACES) {
      if (hay.includes(m.match)) {
        return { listed: true, marketplace: m.name };
      }
    }
    return { listed: false, marketplace: null };
  } catch {
    return { listed: false, marketplace: null };
  }
}
