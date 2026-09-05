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
