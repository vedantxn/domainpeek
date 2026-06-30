// Pure variant generators for defensive-registration scanning. No network.

const VALID = /^[a-z0-9-]+$/;

/** Common typosquat variants of a bare name: omission, adjacent swap, doubling. */
export function typoVariants(name: string): string[] {
  const n = name.toLowerCase();
  const set = new Set<string>();

  for (let i = 0; i < n.length; i++) {
    set.add(n.slice(0, i) + n.slice(i + 1)); // omission
  }
  for (let i = 0; i < n.length - 1; i++) {
    const a = n.split("");
    [a[i], a[i + 1]] = [a[i + 1], a[i]]; // adjacent swap
    set.add(a.join(""));
  }
  for (let i = 0; i < n.length; i++) {
    set.add(n.slice(0, i + 1) + n[i] + n.slice(i + 1)); // double letter
  }

  set.delete(n);
  return [...set].filter((v) => v.length >= 2 && VALID.test(v));
}

/**
 * Build a bounded set of defensive domains to check: the exact name on every
 * given TLD, plus typo variants on a primary TLD (default .com).
 */
export function defensiveVariants(
  name: string,
  tlds: string[],
  typoTld = "com",
  max = 40
): string[] {
  const out = new Set<string>();
  for (const t of tlds) out.add(`${name}.${t.replace(/^\./, "").toLowerCase()}`);
  for (const v of typoVariants(name)) out.add(`${v}.${typoTld}`);
  return [...out].slice(0, max);
}
