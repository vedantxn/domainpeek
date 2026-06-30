import type { WebHistory, CertHistory } from "../types.js";

// Both sources below are flaky (Wayback returned empty, crt.sh 502 during
// probing on 2026-06-30), so everything here is BEST-EFFORT: any failure,
// non-200, timeout, or unexpected shape resolves to null and never throws.

async function getJson(url: string, timeoutMs = 10000): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "domainpeek" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Wayback "first archived" + a rough snapshot count (collapsed by year). */
export async function waybackHistory(
  domain: string
): Promise<WebHistory | null> {
  const data = await getJson(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
      domain
    )}&output=json&fl=timestamp&collapse=timestamp:4&limit=100000`
  );
  if (!Array.isArray(data) || data.length < 2) return null;
  const rows = data.slice(1) as string[][]; // drop header row
  const first = rows[0]?.[0];
  const first_seen =
    typeof first === "string" && first.length >= 8
      ? `${first.slice(0, 4)}-${first.slice(4, 6)}-${first.slice(6, 8)}`
      : null;
  return { first_seen, snapshot_count: rows.length };
}

/** crt.sh: distinct subdomains ever seen in issued certs. */
export async function certHistory(domain: string): Promise<CertHistory | null> {
  const data = await getJson(
    `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
    12000
  );
  if (!Array.isArray(data) || data.length === 0) return null;

  const names = new Set<string>();
  for (const row of data as { name_value?: string }[]) {
    if (typeof row?.name_value === "string") {
      for (const n of row.name_value.split("\n")) names.add(n.trim().toLowerCase());
    }
  }
  const apex = domain.toLowerCase();
  const subs = [...names].filter((n) => n && !n.startsWith("*.") && n !== apex);
  return { subdomains_seen: subs.length, sample: subs.slice(0, 8) };
}
