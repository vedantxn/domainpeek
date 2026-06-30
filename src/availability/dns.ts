import { resolve } from "node:dns/promises";

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
