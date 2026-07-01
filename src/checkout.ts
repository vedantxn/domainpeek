/**
 * Deep link to register a specific domain at a known registrar. Keyless —
 * just a prefilled search/checkout URL, no API or affiliate key.
 */
export function checkoutUrl(registrar: string, domain: string): string | null {
  switch (registrar) {
    case "porkbun":
      return `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
    default:
      return null;
  }
}
