type NavaidLabelRecord = Record<string, any>;

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const buildNavaidLabels = (navaids: NavaidLabelRecord[] = []) =>
  navaids
    .map((navaid) => {
      const lat = numberOrNull(navaid?.lat);
      const lon = numberOrNull(navaid?.lon);
      if (!navaid?.ident || lat === null || lon === null) return null;

      return {
        key: `${navaid.id ?? navaid.ident}-${navaid.ident}`,
        ident: String(navaid.ident),
        name: String(navaid.name || navaid.ident),
        type: String(navaid.type || ""),
        lat,
        lon,
        frequencyKhz: numberOrNull(navaid.frequencyKhz),
        distanceNm: numberOrNull(navaid.distanceNm),
      };
    })
    .filter(Boolean);

export const shouldShowProcedureFixLabels = () => false;
