import { dnsPreCheck, dnsSignals } from "./dns.js";
import { checkRdap } from "./rdap.js";
import type { DnsSignals, RegistrationIntel } from "../types.js";

export interface AvailabilityResult {
  available: boolean | null;
  premium: boolean;
  registration?: RegistrationIntel | null;
  dns?: DnsSignals | null;
}

export async function checkAvailability(
  domain: string,
  opts: { intel?: boolean } = {}
): Promise<AvailabilityResult> {
  // Intel mode: RDAP is authoritative for availability AND carries the
  // registration record, so we always call it (skipping the NS fast-path
  // short-circuit) and gather DNS usage signals in parallel.
  if (opts.intel) {
    const [rdap, dns] = await Promise.all([
      checkRdap(domain),
      dnsSignals(domain),
    ]);
    return {
      available: rdap.available,
      premium: rdap.premium,
      registration: rdap.registration,
      dns,
    };
  }

  // Fast path: NS pre-check short-circuits RDAP when the domain looks taken.
  const dnsResult = await dnsPreCheck(domain);
  if (dnsResult === "likely_taken") {
    return { available: false, premium: false };
  }

  const rdap = await checkRdap(domain);
  return { available: rdap.available, premium: rdap.premium };
}

export { checkRdap, clearBootstrapCache } from "./rdap.js";
export { dnsPreCheck, dnsSignals } from "./dns.js";
