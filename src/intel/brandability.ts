import { readFileSync } from "node:fs";
import type { Brandability } from "../types.js";

// Local system dictionary, loaded once and cached. Keyless; if the file is
// absent (some environments), dictionary_word degrades to false.
let dict: Set<string> | null | undefined;
function loadDict(): Set<string> | null {
  if (dict !== undefined) return dict;
  try {
    const raw = readFileSync("/usr/share/dict/words", "utf-8");
    dict = new Set(
      raw
        .split("\n")
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
    );
  } catch {
    dict = null;
  }
  return dict;
}

function countSyllables(letters: string): number {
  if (!letters) return 0;
  const groups = letters.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 0;
  if (letters.endsWith("e") && n > 1) n--; // crude silent-e
  return Math.max(1, n);
}

function isPronounceable(letters: string): boolean {
  if (!letters) return false;
  if (!/[aeiou]/.test(letters)) return false; // needs a vowel
  if (/[^aeiou]{4,}/.test(letters)) return false; // no 4+ consonant run
  return true;
}

/**
 * Pure-compute brandability heuristic (0-100). Rewards short, pronounceable,
 * digit/hyphen-free names. No network.
 */
export function brandability(name: string): Brandability {
  const lower = name.toLowerCase();
  const letters = lower.replace(/[^a-z]/g, "");
  const length = name.length;
  const has_digits = /[0-9]/.test(name);
  const has_hyphen = name.includes("-");
  const pronounceable = isPronounceable(letters);
  const syllables = countSyllables(letters);
  const d = loadDict();
  const dictionary_word = d ? d.has(letters) : false;

  let score = 100;
  if (length > 6) score -= (length - 6) * 6;
  if (!pronounceable) score -= 30;
  if (has_digits) score -= 20;
  if (has_hyphen) score -= 20;
  if (syllables > 3) score -= (syllables - 3) * 8;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    length,
    pronounceable,
    has_digits,
    has_hyphen,
    dictionary_word,
    syllables,
  };
}
