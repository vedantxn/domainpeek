import type { BrandAvailability } from "../types.js";

/**
 * Returns true when the resource is AVAILABLE (HTTP 404), false when it exists
 * (2xx), null on any error / rate-limit / unexpected status. Keyless.
 */
async function isAvailable(
  url: string,
  method: "GET" | "HEAD",
  headers?: Record<string, string>
): Promise<boolean | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method, headers, signal: controller.signal });
    clearTimeout(timeout);
    if (res.status === 404) return true;
    if (res.ok) return false;
    return null; // 403 rate-limit, 5xx, etc. -> unknown
  } catch {
    return null;
  }
}

/**
 * Is this bare name free as an npm package and a GitHub user/org? Keyless.
 * GitHub's unauthenticated API is capped at 60 req/hr; throttling yields null.
 */
export async function brandAvailability(
  name: string
): Promise<BrandAvailability> {
  const n = encodeURIComponent(name.toLowerCase());
  const [npm, github] = await Promise.all([
    isAvailable(`https://registry.npmjs.org/${n}`, "HEAD"),
    isAvailable(`https://api.github.com/users/${n}`, "GET", {
      "User-Agent": "domainpeek",
      Accept: "application/vnd.github+json",
    }),
  ]);
  return { npm, github };
}
