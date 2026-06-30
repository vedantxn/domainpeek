#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkDomain, checkDomains, getPricing, searchName } from "./index.js";

const server = new McpServer({
  name: "domainpeek",
  version: "0.1.0",
});

server.tool(
  "check_domain",
  "Check if a domain is available, get cheapest-registrar pricing, plus intelligence: registration age/expiry, registrar, 'dropping soon' status, DNSSEC, nameservers, and whether it has a live website/email",
  { domain: z.string().describe("Domain name to check (e.g. example.com)") },
  async ({ domain }) => {
    try {
      const result = await checkDomain(domain, { intel: true });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        content: [{ type: "text", text: JSON.stringify({ error: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "check_domains",
  "Check availability and pricing for multiple domains (max 10)",
  {
    domains: z
      .array(z.string())
      .max(10)
      .describe("Array of domain names to check"),
  },
  async ({ domains }) => {
    try {
      const results = await checkDomains(domains);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        content: [{ type: "text", text: JSON.stringify({ error: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_pricing",
  "Get registrar pricing for a specific TLD (e.g. 'com', 'io', 'ai')",
  { tld: z.string().describe("Top-level domain without dot (e.g. com, io, ai)") },
  async ({ tld }) => {
    try {
      const { prices, stale } = await getPricing(tld);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ prices, stale }, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        content: [{ type: "text", text: JSON.stringify({ error: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "search_name",
  "Check one bare name across many TLDs and return which are available plus the cheapest available option",
  {
    name: z
      .string()
      .describe("Bare name without a dot (e.g. mycoolname)"),
    tlds: z
      .array(z.string())
      .optional()
      .describe("TLDs to search without dots (default: all priced TLDs)"),
  },
  async ({ name, tlds }) => {
    try {
      const result = await searchName(name, tlds);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        content: [{ type: "text", text: JSON.stringify({ error: msg }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
