const MAX_AIRCRAFT_CANVAS_DPR = 3;

export function resolveAircraftCanvasDpr(value: unknown): number {
  const dpr = Number(value);
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(dpr, MAX_AIRCRAFT_CANVAS_DPR);
}
