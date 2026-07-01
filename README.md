# domainpeek

**The zero-config domain intelligence CLI for humans and AI agents.** Check availability, find the cheapest registrar with a one-click register link, and pull deep intelligence on any domain — with no API keys, no accounts, no setup.

```bash
npx domainpeek check stripe.com
```

Most tools stop at "is it available?" domainpeek tells you availability, price, age, expiry, who owns it, whether it's for sale, its email/DNS setup, and more — all keyless, all in one JSON call an agent can act on.

## Quick start

```bash
# Is it available? What's it cost? Where do I buy it?
npx domainpeek check mycoolstartup.dev

# Find a name across every TLD and get the cheapest available one
npx domainpeek find mycoolstartup

# Is my brand's typo/other-TLD space already grabbed?
npx domainpeek guard mycoolstartup
```

## What you get

- **Availability** — live via RDAP (modern WHOIS), with a DNS fast-path.
- **Cheapest price + a register link** — available domains come with a direct `checkout_url` to buy them.
- **Domain intelligence** — age, creation/expiry dates, "dropping soon" + estimated drop date, registrar, DNSSEC, nameservers, live website/email, DNS + email provider, SPF/DMARC posture, TLS cert, for-sale detection, and (best-effort) Wayback history + crt.sh subdomains.
- **`find` across TLDs** — availability + price for one name on every TLD, cheapest flagged, plus **brand availability** (npm package + GitHub handle) and a **brandability score**.
- **`guard` defensive scan** — which typos and other-TLD variants of your brand are already registered.
- **Agent-native** — JSON by default, plus a 6-tool MCP server.
- **Zero config, keyless** — `npx domainpeek` just works. No keys, ever.

## Example

```bash
npx domainpeek check stripe.com --table
```

```
stripe.com  ✗ TAKEN

  registrar: SafeNames Ltd.
  age: 30.8 years
  expires: in 437 days
  dnssec: no
  nameservers: ns-1087.awsdns-07.org, ...

  website: yes  |  email: yes
  dns: AWS Route 53  |  email: Google Workspace
  email security: spf yes  |  dmarc reject
```

```bash
npx domainpeek find lumind --table
```

```
"lumind" across 8 TLDs:
  lumind.dev            AVAILABLE   $9.99 ← cheapest
  ...
  Cheapest available: lumind.dev at $9.99
  → register: https://porkbun.com/checkout/search?q=lumind.dev

  brand: npm free  |  github taken
  brandability: 100/100 (2 syl, pronounceable)
```

## Comparison

| | domainpeek | tldx | domain-check |
|---|:---:|:---:|:---:|
| Availability | ✅ | ✅ | ✅ |
| Cheapest price + register link | ✅ | ❌ | ❌ |
| Registration intel (age/expiry/registrar) | ✅ | ❌ | ❌ |
| DNS / email / TLS / SPF-DMARC intel | ✅ | ❌ | ❌ |
| Brand check (npm + GitHub) | ✅ | ❌ | ❌ |
| Typosquat / defensive scan | ✅ | partial | ❌ |
| MCP server | ✅ | ✅ | ❌ |
| Zero config, keyless | ✅ | ✅ | ✅ |

## Install

```bash
npx domainpeek check example.com   # no install
npm install -g domainpeek          # global CLI
npm install domainpeek             # as a library
```

## CLI

```bash
# check: availability + price + register link + intelligence
domainpeek check startup.ai
domainpeek check startup.ai,startup.io,startup.dev   # batch (max 10)
domainpeek check startup.ai --table                  # human-readable
domainpeek check startup.ai --fast                   # availability only, skip intel
domainpeek check startup.ai --deep                   # + TLS cert, Wayback, crt.sh

# find: one name across every TLD, cheapest flagged, + brand availability
domainpeek find startup
domainpeek find startup --tlds com,io,dev,ai

# guard: which typo/other-TLD variants are already registered
domainpeek guard startup
```

JSON is the default when output is piped; add `--table` for a human view. Exit codes: `0` all resolved, `1` partial failure, `2` total failure / invalid input.

## Library

```typescript
import {
  checkDomain,   // availability + price + intel for one domain
  checkDomains,  // batch, max 10
  searchName,    // one name across TLDs + brand + brandability
  brandCheck,    // npm + GitHub availability + brandability score
  defensiveScan, // typo / other-TLD registration scan
  getPricing,    // registrar pricing for a TLD
} from "domainpeek";

const r = await checkDomain("mycoolapp.dev", { intel: true, deep: false });
r.available;     // true
r.cheapest;      // { registrar: "porkbun", year1_usd_cents: 999, ... }
r.checkout_url;  // "https://porkbun.com/checkout/search?q=mycoolapp.dev"
```

## MCP server

Add to Claude Code / Cursor:

```json
{
  "mcpServers": {
    "domainpeek": { "command": "npx", "args": ["-y", "domainpeek", "--mcp"] }
  }
}
```

Tools: `check_domain` (with optional `deep`), `check_domains`, `get_pricing`, `search_name`, `brand_check`, `guard_name`.

## How it works

1. **Availability** — live RDAP lookup (falls back to a DNS NS pre-check for speed). Free, standardized, keyless.
2. **Intelligence** — the RDAP record we already fetch is parsed for registration data; the system resolver supplies DNS/email signals; a TLS handshake reads the cert. All keyless. Wayback and crt.sh are best-effort and degrade to nothing when they're down.
3. **Pricing** — verified hourly against Porkbun's public pricing API in CI and published as a static JSON file the CLI caches for 1 hour. `price_updated_at` marks when a price last *changed*, not when it was fetched.
4. **Brand checks** — `registry.npmjs.org` and the GitHub users API (unauthenticated, so subject to GitHub's 60 req/hr cap; returns unknown when throttled).

No API keys anywhere. The only thing that ever leaves your machine is the domain/name you ask about.

## Pricing coverage

Pricing currently comes from **Porkbun** (their full public price list, 8+ TLDs, hourly-verified). More registrars will be added as keyless/live sources become available — most registrars gate pricing behind API keys, which would break the zero-config promise.

## Contributing

Issues and PRs welcome — especially new keyless intelligence sources and registrar pricing integrations. MIT licensed.

## License

MIT
