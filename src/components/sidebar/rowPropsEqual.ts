// Shared React.memo comparator for the sidebar list rows (AircraftRow,
// AirportRow). The poll pipeline hands down fresh object identities every
// tick (trace tracker + the per-poll distance re-map), so referential memo
// can't bail — rows compare by value instead: the scalar props (selection,
// id, click handler) plus the rendered fields of the nested entity object.
//
// IMPORTANT: `nestedFields` must list every field of the entity that the
// row renders. If you add a rendered field to a row, add it here too, or
// the memo will show stale data until some other field changes.
export function rowPropsEqual(
  prev: Record<string, any>,
  next: Record<string, any>,
  {
    scalarKeys,
    nestedKey,
    nestedFields,
  }: { scalarKeys: string[]; nestedKey: string; nestedFields: string[] },
) {
  for (const key of scalarKeys) {
    if (prev[key] !== next[key]) return false;
  }
  const a = prev[nestedKey] || {};
  const b = next[nestedKey] || {};
  if (a === b) return true;
  return nestedFields.every((key) => a[key] === b[key]);
}
