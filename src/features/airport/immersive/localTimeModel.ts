const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_BUCKET_MINUTES = 15;

type LocalTimeOptions = {
  date?: Date | string | number | null;
  lat?: unknown;
  lon?: unknown;
  bucketMinutes?: unknown;
};

function toDate(value: LocalTimeOptions["date"]) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (value == null || value === "") return new Date();
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function toFiniteCoordinate(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function wrapDayMinutes(minutes: number) {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function resolveBucketInterval(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_BUCKET_MINUTES;
  return Math.max(1, Math.min(MINUTES_PER_DAY, Math.round(numeric)));
}

export function estimateLocalSolarMinutes({
  date = new Date(),
  lon = null,
}: LocalTimeOptions = {}) {
  const resolvedDate = toDate(date);
  const utcMinutes =
    resolvedDate.getUTCHours() * 60 + resolvedDate.getUTCMinutes();
  const longitude = toFiniteCoordinate(lon);
  const localOffsetMinutes = longitude == null ? 0 : Math.round(longitude * 4);
  return wrapDayMinutes(utcMinutes + localOffsetMinutes);
}

export function resolveImmersiveLocalTime({
  date = new Date(),
  lat = null,
  lon = null,
  bucketMinutes = DEFAULT_BUCKET_MINUTES,
}: LocalTimeOptions = {}) {
  const resolvedDate = toDate(date);
  const interval = resolveBucketInterval(bucketMinutes);
  const utcMinutes =
    resolvedDate.getUTCHours() * 60 + resolvedDate.getUTCMinutes();
  const longitude = toFiniteCoordinate(lon);
  const latitude = toFiniteCoordinate(lat);
  const localOffsetMinutes = longitude == null ? 0 : Math.round(longitude * 4);
  const localMinutes = wrapDayMinutes(utcMinutes + localOffsetMinutes);
  const bucket = Math.floor(localMinutes / interval) * interval;

  return {
    bucketMinutes: bucket,
    cacheKey: `immersive-local-${bucket}`,
    date: resolvedDate,
    intervalMinutes: interval,
    lat: latitude,
    localMinutes,
    localOffsetMinutes,
    lon: longitude,
    utcMinutes,
  };
}
