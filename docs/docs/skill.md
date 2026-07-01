---
name: domainpeek
description: >-
  Keyless domain intelligence CLI and MCP server. Use when checking domain
  availability, registrar pricing, checkout links, TLD search, brand/npm/GitHub
  checks, or defensive typo scans. No API keys required.
---

# domainpeek

Keyless domain intelligence for humans and AI agents. Availability, cheapest registrar price with a direct register link, and RDAP/DNS intel — no API keys, no config.

## When to use

- Checking if a domain is available and where to buy it cheapest
- Researching a taken domain (age, expiry, registrar, DNS/email setup)
- Searching a bare name across multiple TLDs during brand naming
- Checking npm package and GitHub handle availability
- Auditing typo and other-TLD variants for defensive registration
- Agent workflows that need structured JSON instead of scraping WHOIS tabs

## CLI

Run without installing:

```bash
npx domainpeek check stripe.com    # availability + price + intel
npx domainpeek find lumind         # name across TLDs + brand check
npx domainpeek guard stripe        # typo / other-TLD defensive scan
```

### Commands

| Command | Purpose |
|---------|---------|
| `check <domain>` | Availability, pricing, `checkout_url`, registration/DNS intel |
| `check d1,d2,...` | Batch check up to 10 domains |
| `find <name>` | Bare name across priced TLDs; cheapest flagged |
| `guard <name>` | Typo + other-TLD variant registration scan |

### Flags

- `--table` — human-readable output (default in TTY without `--json`)
- `--fast` — availability only, skip intel (`check` only)
- `--deep` — add TLS cert, Wayback history, crt.sh subdomains (`check` only)
- `--tlds com,io,dev` — limit TLD scope (`find`, `guard`)

JSON is the default when stdout is piped. Exit codes: `0` success, `1` partial failure, `2` total failure.

## MCP setup

Add to Claude Code / Cursor:

```json
{
  "mcpServers": {
    "domainpeek": { "command": "npx", "args": ["-y", "domainpeek", "--mcp"] }
  }
}
```

Or run directly: `npx -y domainpeek --mcp`

## MCP tools

| Tool | Purpose |
|------|---------|
| `check_domain` | Availability, pricing, `checkout_url`, registration/DNS intel; optional `deep` |
| `check_domains` | Batch availability + pricing for up to 10 domains |
| `get_pricing` | Registrar pricing for a TLD (e.g. `com`, `io`) |
| `search_name` | Bare name across TLDs; returns available domains and cheapest |
| `brand_check` | npm + GitHub availability and brandability score |
| `guard_name` | Typo and other-TLD defensive registration scan |

## Key response fields

### `check_domain` / `check`

- `available` — `true`, `false`, or `null` if lookup failed
- `cheapest` — `{ registrar, year1_usd_cents, ... }` when pricing exists
- `checkout_url` — direct register link when domain is available
- `registration` — `created_at`, `expires_at`, `age_days`, `registrar`, `dropping_soon`, `nameservers`, `dnssec`
- `dns` — `has_website`, `has_email`, `dns_provider`, `email_provider`
- `email_security` — `spf`, `dmarc`, `dmarc_policy`
- `for_sale` — marketplace listing detection
- `tls`, `web_history`, `cert_history` — present when `deep: true`

### `search_name` / `find`

- `available` — array of available `name.tld` strings
- `cheapest` — cheapest available option with price
- `brand` — `{ npm, github }` availability (`null` when throttled)
- `brandability` — score, syllables, pronounceability

### `guard_name` / `guard`

- `variants` — array of `{ variant, registered }` for typo and TLD variants

## Behavior notes

- All data comes from public, keyless sources (RDAP, DNS resolver, TLS handshake, npm/GitHub APIs, static pricing file)
- Unavailable or throttled sources return honest `null` — never fabricated data
- Pricing is Porkbun-only today; `pricing_stale` may be set on cached data
- GitHub unauthenticated API caps at 60 req/hr; brand checks may return `null` when throttled
- Wayback and crt.sh are best-effort and often return nothing

## Install

```bash
npx domainpeek check example.com   # no install
npm install -g domainpeek          # global CLI
npm install domainpeek             # as a library
```

Repo: https://github.com/vedantxn/domainpeek
