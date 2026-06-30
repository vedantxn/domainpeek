import { dnsPreCheck } from "./dns.js";
import { checkRdap } from "./rdap.js";

export async function checkAvailability(
  domain: string
): Promise<{ available: boolean | null; premium: boolean }> {
  const dnsResult = await dnsPreCheck(domain);

  if (dnsResult === "likely_taken") {
    return { available: false, premium: false };
  }

  return checkRdap(domain);
}

export { checkRdap, clearBootstrapCache } from "./rdap.js";
export { dnsPreCheck } from "./dns.js";
