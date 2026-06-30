import { defineCommand, runMain } from "citty";
import { checkDomain, checkDomains, searchName } from "./index.js";
import type {
  BatchCheckResult,
  DnsSignals,
  DomainResult,
  NameSearchResult,
  RegistrationIntel,
} from "./types.js";

function relativeTime(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatAge(days: number): string {
  if (days >= 365) return `${(days / 365).toFixed(1)} years`;
  return `${days} days`;
}

function formatRegistration(reg: RegistrationIntel): string[] {
  const lines: string[] = [""];
  if (reg.dropping_soon) {
    lines.push("  ⚠ dropping soon (in redemption / pending delete)");
  }
  if (reg.registrar) lines.push(`  registrar: ${reg.registrar}`);
  if (reg.age_days !== null) lines.push(`  age: ${formatAge(reg.age_days)}`);
  if (reg.expires_in_days !== null) {
    lines.push(`  expires: in ${reg.expires_in_days} days`);
  }
  if (reg.dnssec !== null) lines.push(`  dnssec: ${reg.dnssec ? "yes" : "no"}`);
  if (reg.nameservers.length > 0) {
    lines.push(
      `  nameservers: ${reg.nameservers.slice(0, 4).join(", ").toLowerCase()}`
    );
  }
  return lines;
}

function formatDnsSignals(dns: DnsSignals): string[] {
  const lines: string[] = [""];
  const usage = [
    `website: ${dns.has_website ? "yes" : "no"}`,
    `email: ${dns.has_email ? "yes" : "no"}`,
  ];
  if (dns.parked) usage.push("parked: yes");
  lines.push(`  ${usage.join("  |  ")}`);
  const providers: string[] = [];
  if (dns.dns_provider) providers.push(`dns: ${dns.dns_provider}`);
  if (dns.email_provider) providers.push(`email: ${dns.email_provider}`);
  if (providers.length > 0) lines.push(`  ${providers.join("  |  ")}`);
  return lines;
}

function formatTable(results: DomainResult[]): string {
  const lines: string[] = [];

  for (const r of results) {
    const status =
      r.available === true
        ? "✓ AVAILABLE"
        : r.available === false
          ? "✗ TAKEN"
          : "? UNKNOWN";

    lines.push(`${r.domain}  ${status}`);

    if (r.available && r.prices.length > 0) {
      lines.push("");
      lines.push("  Registrar       Year 1     Renewal");
      lines.push("  ─────────────────────────────────────");
      for (const p of r.prices) {
        const y1 = `$${(p.year1_usd_cents / 100).toFixed(2)}`;
        const ren = `$${(p.renewal_usd_cents / 100).toFixed(2)}`;
        const tag = p === r.cheapest ? " ← cheapest" : "";
        lines.push(
          `  ${p.registrar.padEnd(14)} ${y1.padEnd(10)} ${ren}${tag}`
        );
      }
      const lastChanged = r.prices
        .map((p) => p.price_updated_at)
        .filter((t) => !Number.isNaN(Date.parse(t)))
        .sort()
        .at(-1);
      const rel = lastChanged ? relativeTime(lastChanged) : null;
      if (rel) {
        lines.push("");
        lines.push(`  prices last changed: ${rel}`);
      }
    } else if (r.available && r.prices.length === 0) {
      lines.push("  (pricing data not available)");
    }

    if (r.registration) lines.push(...formatRegistration(r.registration));
    if (r.dns) lines.push(...formatDnsSignals(r.dns));
    if (r.pricing_notes && r.pricing_notes.length > 0) {
      lines.push("");
      for (const note of r.pricing_notes) lines.push(`  note: ${note}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatNameSearch(res: NameSearchResult): string {
  const lines: string[] = [];
  lines.push(`"${res.name}" across ${res.results.length} TLDs:`);
  lines.push("");
  lines.push("  Domain                Status       Year 1");
  lines.push("  ─────────────────────────────────────────────");
  for (const r of res.results) {
    const status =
      r.available === true
        ? "AVAILABLE"
        : r.available === false
          ? "taken"
          : "unknown";
    const price = r.cheapest
      ? `$${(r.cheapest.year1_usd_cents / 100).toFixed(2)}`
      : "-";
    const tag =
      res.cheapest_available && r.domain === res.cheapest_available.domain
        ? " ← cheapest"
        : "";
    lines.push(
      `  ${r.domain.padEnd(20)} ${status.padEnd(11)} ${price}${tag}`
    );
  }
  lines.push("");
  if (res.available.length === 0) {
    lines.push("  No available TLDs in this set.");
  } else if (res.cheapest_available) {
    const c = res.cheapest_available.cheapest;
    const priceStr = c ? ` at $${(c.year1_usd_cents / 100).toFixed(2)}` : "";
    lines.push(`  Cheapest available: ${res.cheapest_available.domain}${priceStr}`);
  }
  return lines.join("\n");
}

const checkCmd = defineCommand({
  meta: {
    description: "Check domain availability and registrar pricing",
  },
  args: {
    domains: {
      type: "positional",
      description: "Domain(s) to check",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Output JSON (default for piped output)",
      default: false,
    },
    table: {
      type: "boolean",
      description: "Output human-readable table",
      default: false,
    },
    fast: {
      type: "boolean",
      description: "Skip RDAP/DNS intelligence for a faster availability-only check",
      default: false,
    },
  },
  async run({ args }) {
    const rawDomains = Array.isArray(args.domains)
      ? args.domains
      : [args.domains];
    const domains = rawDomains.flatMap((d: string) => d.split(/[,\s]+/)).filter(Boolean);

    if (domains.length === 0) {
      console.error("Error: provide at least one domain to check");
      process.exit(2);
    }

    if (domains.length > 10) {
      console.error("Error: maximum 10 domains per query");
      process.exit(2);
    }

    const useJson = args.json || (!args.table && !process.stdout.isTTY);

    try {
      let output: DomainResult | BatchCheckResult;
      let results: DomainResult[];

      if (domains.length === 1) {
        const result = await checkDomain(domains[0], { intel: !args.fast });
        output = result;
        results = [result];
      } else {
        const batch = await checkDomains(domains);
        output = batch;
        results = batch.results;
      }

      const hasFailures = results.some((r) => r.available === null);

      if (useJson) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log(formatTable(results));
      }

      if (hasFailures && results.some((r) => r.available !== null)) {
        process.exit(1);
      } else if (results.every((r) => r.available === null)) {
        process.exit(2);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Error: ${err.message}`);
      }
      process.exit(2);
    }
  },
});

const findCmd = defineCommand({
  meta: {
    description: "Check one name across many TLDs and find the cheapest available",
  },
  args: {
    name: {
      type: "positional",
      description: "Bare name without a dot (e.g. mycoolname)",
      required: true,
    },
    tlds: {
      type: "string",
      description: "Comma-separated TLDs to search (default: all priced TLDs)",
    },
    json: {
      type: "boolean",
      description: "Output JSON (default for piped output)",
      default: false,
    },
    table: {
      type: "boolean",
      description: "Output human-readable table",
      default: false,
    },
  },
  async run({ args }) {
    const name = Array.isArray(args.name) ? args.name[0] : args.name;
    const tlds = args.tlds
      ? String(args.tlds)
          .split(/[,\s]+/)
          .filter(Boolean)
      : undefined;

    const useJson = args.json || (!args.table && !process.stdout.isTTY);

    try {
      const result = await searchName(name, tlds);
      if (useJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatNameSearch(result));
      }
      if (result.available.length === 0) process.exit(1);
    } catch (err) {
      if (err instanceof Error) console.error(`Error: ${err.message}`);
      process.exit(2);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "domainpeek",
    version: "0.1.0",
    description:
      "Domain availability, cheapest registrar price, and keyless intelligence. Zero config.",
  },
  subCommands: {
    check: checkCmd,
    find: findCmd,
  },
});

export async function runCli(): Promise<void> {
  await runMain(main);
}
