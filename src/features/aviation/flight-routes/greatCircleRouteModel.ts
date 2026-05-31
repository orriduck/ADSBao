type GeoPointInput = {
  lat?: unknown;
  lon?: unknown;
};

type CartesianPoint = {
  x: number;
  y: number;
  z: number;
};

type GreatCirclePathOptions = {
  from?: GeoPointInput | null;
  to?: GeoPointInput | null;
  segments?: unknown;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

function toPoint(value: GeoPointInput | null | undefined) {
  if (value?.lat == null || value?.lon == null) return null;
  const lat = Number(value?.lat);
  const lon = Number(value?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function toCartesian({ lat, lon }: { lat: number; lon: number }) {
  const phi = toRadians(lat);
  const lambda = toRadians(lon);
  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.cos(lambda),
    y: cosPhi * Math.sin(lambda),
    z: Math.sin(phi),
  };
}

function fromCartesian({ x, y, z }: CartesianPoint) {
  const hyp = Math.hypot(x, y);
  return [toDegrees(Math.atan2(z, hyp)), toDegrees(Math.atan2(y, x))];
}

export function buildGreatCirclePath({ from, to, segments = 32 }: GreatCirclePathOptions = {}) {
  const start = toPoint(from);
  const end = toPoint(to);
  if (!start || !end) return [];

  const steps = Math.max(2, Math.round(Number(segments) || 32));
  const a = toCartesian(start);
  const b = toCartesian(end);
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);

  if (!Number.isFinite(omega) || Math.abs(sinOmega) < 1e-9) {
    return [
      [start.lat, start.lon],
      [end.lat, end.lon],
    ];
  }

  return Array.from({ length: steps + 1 }, (_, index) => {
    if (index === 0) return [start.lat, start.lon];
    if (index === steps) return [end.lat, end.lon];
    const t = index / steps;
    const startScale = Math.sin((1 - t) * omega) / sinOmega;
    const endScale = Math.sin(t * omega) / sinOmega;
    return fromCartesian({
      x: startScale * a.x + endScale * b.x,
      y: startScale * a.y + endScale * b.y,
      z: startScale * a.z + endScale * b.z,
    });
  });
}
