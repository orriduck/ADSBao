"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveImmersiveColorScheme } from "./immersiveColorModel";

const BUCKET_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function toFiniteLongitude(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function msSinceUtcMidnight(date: Date) {
  return (
    date.getUTCHours() * 60 * 60 * 1000 +
    date.getUTCMinutes() * 60 * 1000 +
    date.getUTCSeconds() * 1000 +
    date.getUTCMilliseconds()
  );
}

function msUntilNextLocalBucket(date: Date, lon: unknown) {
  const longitude = toFiniteLongitude(lon);
  const offsetMs = (longitude == null ? 0 : Math.round(longitude * 4)) * 60 * 1000;
  const localMs =
    ((msSinceUtcMidnight(date) + offsetMs) % DAY_MS + DAY_MS) % DAY_MS;
  const remainder = localMs % BUCKET_MS;
  const delay = remainder === 0 ? BUCKET_MS : BUCKET_MS - remainder;
  return Math.max(1000, delay);
}

export function useImmersiveColorScheme({
  enabled = false,
  lat = null,
  lon = null,
}: Record<string, any> = {}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = 0;
    const schedule = () => {
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(schedule, msUntilNextLocalBucket(current, lon));
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled, lon]);

  return useMemo(() => {
    if (!enabled) return null;
    return resolveImmersiveColorScheme({ date: now, lat, lon });
  }, [enabled, lat, lon, now]);
}
