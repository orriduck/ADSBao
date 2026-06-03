function sanitizeAircraftPhotoCode(value, { max = 16 } = {}) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9-]+$/.test(normalized) && normalized.length <= max
    ? normalized
    : "";
}

export function buildAircraftPhotoQuery(searchParams) {
  return {
    registration: sanitizeAircraftPhotoCode(searchParams?.get("registration"), {
      max: 12,
    }),
    type: sanitizeAircraftPhotoCode(searchParams?.get("type"), { max: 8 }),
  };
}
