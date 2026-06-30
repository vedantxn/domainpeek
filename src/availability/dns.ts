import { resolve, resolve4, resolve6, resolveMx, resolveNs } from "node:dns/promises";
import type { DnsSignals } from "../types.js";
import {
  detectDnsProvider,
  detectEmailProvider,
  isParked,
} from "./providers.js";

export async function dnsPreCheck(domain: string): Promise<"likely_taken" | "unknown"> {
  try {
    const records = await resolve(domain, "NS");
    if (records.length > 0) {
      return "likely_taken";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Keyless "is this domain actually in use" signals from the system resolver.
 * Every lookup degrades to empty on error (NXDOMAIN, SERVFAIL, timeout).
 */
export async function dnsSignals(domain: string): Promise<DnsSignals> {
  const [a, aaaa, mx, ns] = await Promise.all([
    resolve4(domain).catch(() => [] as string[]),
    resolve6(domain).catch(() => [] as string[]),
    resolveMx(domain).catch(() => [] as { exchange: string; priority: number }[]),
    resolveNs(domain).catch(() => [] as string[]),
  ]);

  const mxHosts = mx.map((m) => m.exchange);

  return {
    has_website: a.length > 0 || aaaa.length > 0,
    has_email: mxHosts.length > 0,
    parked: ns.length > 0 ? isParked(ns) : null,
    dns_provider: detectDnsProvider(ns),
    email_provider: detectEmailProvider(mxHosts),
  };
}
