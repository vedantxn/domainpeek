// Hostname-substring heuristics for naming the DNS host, email host, and
// parking services behind a domain. Keyless: derived purely from NS/MX records.

interface ProviderRule {
  match: string;
  name: string;
}

const DNS_PROVIDERS: ProviderRule[] = [
  { match: "cloudflare", name: "Cloudflare" },
  { match: "awsdns", name: "AWS Route 53" },
  { match: "googledomains", name: "Google" },
  { match: "google.com", name: "Google" },
  { match: "domaincontrol.com", name: "GoDaddy" },
  { match: "registrar-servers.com", name: "Namecheap" },
  { match: "porkbun", name: "Porkbun" },
  { match: "dnsimple", name: "DNSimple" },
  { match: "azure-dns", name: "Microsoft Azure" },
  { match: "nsone.net", name: "NS1" },
  { match: "digitalocean", name: "DigitalOcean" },
  { match: "vercel-dns", name: "Vercel" },
  { match: "dnsmadeeasy", name: "DNS Made Easy" },
];

const EMAIL_PROVIDERS: ProviderRule[] = [
  { match: "google", name: "Google Workspace" },
  { match: "googlemail", name: "Google Workspace" },
  { match: "protection.outlook", name: "Microsoft 365" },
  { match: "outlook.com", name: "Microsoft 365" },
  { match: "zoho", name: "Zoho" },
  { match: "icloud", name: "iCloud" },
  { match: "messagingengine", name: "Fastmail" },
  { match: "pphosted", name: "Proofpoint" },
  { match: "mimecast", name: "Mimecast" },
  { match: "amazonaws", name: "Amazon SES" },
];

const PARKING_NS = [
  "sedoparking",
  "bodis",
  "parkingcrew",
  "above.com",
  "dan.com",
  "afternic",
  "uniregistry",
  "parklogic",
  "voodoo.com",
  "fabulous.com",
];

function detect(hostnames: string[], rules: ProviderRule[]): string | null {
  const lower = hostnames.map((h) => h.toLowerCase());
  for (const rule of rules) {
    if (lower.some((h) => h.includes(rule.match))) return rule.name;
  }
  return null;
}

export function detectDnsProvider(nameservers: string[]): string | null {
  return detect(nameservers, DNS_PROVIDERS);
}

export function detectEmailProvider(mxHosts: string[]): string | null {
  return detect(mxHosts, EMAIL_PROVIDERS);
}

export function isParked(nameservers: string[]): boolean {
  const lower = nameservers.map((h) => h.toLowerCase());
  return PARKING_NS.some((p) => lower.some((h) => h.includes(p)));
}
