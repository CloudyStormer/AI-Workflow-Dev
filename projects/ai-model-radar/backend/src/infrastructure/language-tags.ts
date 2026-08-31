import type { DatabaseSync, SQLOutputValue } from "node:sqlite";

const MAX_BCP47_LENGTH = 35;

export function normalizeSourceLanguage(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("source language must be a string");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_BCP47_LENGTH) {
    throw new RangeError("source language must be a valid BCP 47 tag");
  }
  const [canonical] = Intl.getCanonicalLocales(trimmed);
  if (canonical === undefined || canonical.length > MAX_BCP47_LENGTH) {
    throw new RangeError("source language must be a valid BCP 47 tag");
  }
  return canonical;
}

export function registerLanguageTagFunctions(database: DatabaseSync): void {
  database.function(
    "canonical_bcp47",
    { deterministic: true },
    (value: SQLOutputValue): string => normalizeSourceLanguage(value),
  );
}
