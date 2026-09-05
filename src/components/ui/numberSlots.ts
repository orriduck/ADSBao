// Preserve digit identity across carries, separators and sign changes. Decimal
// places stay anchored even when the formatted precision changes.
export function numberSlots(parts: Intl.NumberFormatPart[]) {
  let integerPlace = parts.reduce((count, part) => count + (part.type === "integer" ? Array.from(part.value).length : 0), 0);
  let fractionPlace = 0;
  return parts.flatMap((part, index) => {
    if (part.type === "integer") {
      return Array.from(part.value, (text) => ({ key: `integer:${--integerPlace}`, text }));
    }
    if (part.type === "fraction") {
      return Array.from(part.value, (text) => ({ key: `fraction:${fractionPlace++}`, text }));
    }
    return [{ key: part.type === "group" ? `group:${integerPlace}` : `${part.type}:${index}`, text: part.value }];
  });
}

// Keep already-formatted readings exact (09:05, 30.00, 18° / 12°, 10+ SM).
// Each numeric field has its own right-anchored slots so a carry in one field
// does not shift the identities of the other fields or their punctuation.
export function formattedNumberSlots(value: string) {
  let field = 0;
  return value.split(/(\p{Decimal_Number}+)/u).flatMap((text, index) => {
    if (!/^\p{Decimal_Number}+$/u.test(text)) {
      return [{ key: `literal:${index}`, text }];
    }
    const digits = Array.from(text);
    const currentField = field++;
    return digits.map((digit, place) => ({
      key: `field:${currentField}:${digits.length - place - 1}`,
      text: digit,
    }));
  });
}
