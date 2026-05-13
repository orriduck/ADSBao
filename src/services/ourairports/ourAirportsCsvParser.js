// RFC 4180-ish CSV parser tuned for OurAirports payloads. Header row drives
// the keys of each emitted object; values are returned as raw strings (empty
// string for missing). Caller is responsible for type coercion via the
// normalizer.

const QUOTE = '"';
const CR = "\r";
const LF = "\n";
const COMMA = ",";

const parseRow = (line, cursor) => {
  const fields = [];
  const length = line.length;
  let index = cursor;
  let field = "";
  let inQuotes = false;

  while (index < length) {
    const char = line[index];

    if (inQuotes) {
      if (char === QUOTE) {
        if (line[index + 1] === QUOTE) {
          field += QUOTE;
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === QUOTE) {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === COMMA) {
      fields.push(field);
      field = "";
      index += 1;
      continue;
    }

    if (char === CR) {
      if (line[index + 1] === LF) {
        index += 2;
      } else {
        index += 1;
      }
      fields.push(field);
      return { fields, nextIndex: index, done: false };
    }

    if (char === LF) {
      index += 1;
      fields.push(field);
      return { fields, nextIndex: index, done: false };
    }

    field += char;
    index += 1;
  }

  fields.push(field);
  return { fields, nextIndex: index, done: true };
};

export const parseCsv = (text) => {
  if (typeof text !== "string") {
    throw new TypeError("parseCsv expects a string");
  }
  if (text.length === 0) return { headers: [], rows: [] };

  const startsWithBom = text.charCodeAt(0) === 0xfeff;
  const body = startsWithBom ? text.slice(1) : text;
  const length = body.length;

  const headerResult = parseRow(body, 0);
  const headers = headerResult.fields;
  const rows = [];
  let cursor = headerResult.nextIndex;

  while (cursor < length) {
    const result = parseRow(body, cursor);
    cursor = result.nextIndex;
    if (result.fields.length === 1 && result.fields[0] === "") continue;
    rows.push(toRecord(headers, result.fields));
    if (result.done) break;
  }

  return { headers, rows };
};

const toRecord = (headers, fields) => {
  const record = {};
  for (let i = 0; i < headers.length; i += 1) {
    record[headers[i]] = i < fields.length ? fields[i] : "";
  }
  return record;
};
