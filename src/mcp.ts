#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkDomain, checkDomains, getPricing } from "./index.js";

const server = new McpServer({
  name: "agent-domain",
  version: "0.1.0",
});

server.tool(
  "check_domain",
  "Check if a domain is available and get pricing from cheapest registrar",
  { domain: z.string().describe("Domain name to check (e.g. example.com)") },
  async ({ domain }) => {
    try {
      const result = await checkDomain(domain);
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
      const prices = await getPricing(tld);
      return {
        content: [{ type: "text", text: JSON.stringify(prices, null, 2) }],
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
