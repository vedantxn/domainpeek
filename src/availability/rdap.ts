const RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";

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

export async function checkRdap(
  domain: string
): Promise<{ available: boolean | null; premium: boolean }> {
  const tld = extractTld(domain);

  let serverUrl: string;
  try {
    const bootstrap = await getBootstrap();
    serverUrl = bootstrap[tld];
    if (!serverUrl) {
      return { available: null, premium: false };
    }
  } catch {
    return { available: null, premium: false };
  }

  const url = `${serverUrl}/domain/${domain}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 404) {
      return { available: true, premium: false };
    }

    if (!res.ok) {
      return { available: null, premium: false };
    }

    const data = (await res.json()) as {
      status?: string[];
      events?: { eventAction: string }[];
    };

    const statuses = data.status || [];
    const isActive = statuses.some(
      (s) =>
        s === "active" ||
        s === "registered" ||
        s === "server renew prohibited" ||
        s === "client transfer prohibited"
    );

    if (isActive) {
      return { available: false, premium: false };
    }

    const isRedemption = statuses.some(
      (s) => s === "redemption period" || s === "pending delete"
    );
    if (isRedemption) {
      return { available: false, premium: false };
    }

    return { available: false, premium: false };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { available: null, premium: false };
    }
    return { available: null, premium: false };
  }
}

export function clearBootstrapCache(): void {
  bootstrapCache = null;
}
