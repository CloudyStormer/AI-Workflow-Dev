import { PolicyRegistryError } from "./errors.mjs";

export function parseCsv(input) {
  if (typeof input !== "string" || input.length === 0) {
    throw new PolicyRegistryError("REGISTRY_EMPTY", "Registry CSV must be a non-empty string.");
  }

  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let quotedField = false;

  const finishField = () => {
    row.push(field);
    field = "";
    quotedField = false;
  };

  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0 || quotedField) {
        throw new PolicyRegistryError("CSV_INVALID_QUOTE", "Unexpected quote in unquoted CSV field.", {
          index,
        });
      }
      inQuotes = true;
      quotedField = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRow();
    } else if (character === "\r") {
      if (text[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      if (quotedField) {
        throw new PolicyRegistryError(
          "CSV_TRAILING_CHARACTERS",
          "Only a delimiter or row ending may follow a quoted CSV field.",
          { index },
        );
      }
      field += character;
    }
  }

  if (inQuotes) {
    throw new PolicyRegistryError("CSV_UNCLOSED_QUOTE", "Registry CSV contains an unclosed quote.");
  }

  if (field.length > 0 || row.length > 0 || quotedField) finishRow();
  return rows;
}
