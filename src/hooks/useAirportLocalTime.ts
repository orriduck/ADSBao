import { useEffect, useMemo, useState } from "react";

const MINUTE_MS = 60_000;

export type AirportLocalTime = {
  value: string;
  zone: string;
};

function formatUtcOffset(offsetName: string): string {
  const match = /^(?:GMT|UTC)(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(
    offsetName,
  );
  if (!match) return offsetName.replace(/^GMT/, "UTC");
  if (!match[1]) return "UTC";

  const sign = match[1] === "-" ? "−" : "+";
  const hours = String(Number(match[2]));
  const minutes = match[3] && match[3] !== "00" ? `:${match[3]}` : "";
  return `UTC${sign}${hours}${minutes}`;
}

export function formatAirportLocalTime(
  timeZone: unknown,
  instant: Date = new Date(),
): AirportLocalTime {
  const normalizedTimeZone = String(timeZone || "").trim();
  if (!normalizedTimeZone || Number.isNaN(instant.getTime())) {
    return { value: "—", zone: "" };
  }

  try {
    const value = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: normalizedTimeZone,
    }).format(instant);
    const offsetName =
      new Intl.DateTimeFormat("en-US", {
        timeZone: normalizedTimeZone,
        timeZoneName: "longOffset",
      })
        .formatToParts(instant)
        .find((part) => part.type === "timeZoneName")?.value || "";
    const zone = formatUtcOffset(offsetName);

    return { value, zone };
  } catch {
    return { value: "—", zone: "" };
  }
}

function useMinuteClock(clockKey: string) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    if (!clockKey) return undefined;

    let intervalId: number | undefined;
    const delayToNextMinute = MINUTE_MS - (Date.now() % MINUTE_MS) + 20;
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), MINUTE_MS);
    }, delayToNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [clockKey]);

  return now;
}

export function useAirportLocalTime(timeZone: unknown): AirportLocalTime {
  const normalizedTimeZone = String(timeZone || "").trim();
  const now = useMinuteClock(normalizedTimeZone);
  return useMemo(
    () => formatAirportLocalTime(normalizedTimeZone, now),
    [normalizedTimeZone, now],
  );
}

function offsetMinutes(zone: string): number | null {
  if (zone === "UTC") return 0;
  const match = /^UTC([+−])(\d{1,2})(?::(\d{2}))?$/.exec(zone);
  if (!match) return null;
  return (Number(match[2]) * 60 + Number(match[3] || 0)) *
    (match[1] === "−" ? -1 : 1);
}

// Compare offsets at the same instant, rather than subtracting clock faces.
// This preserves the sign across midnight, DST and fractional-hour zones.
export function formatAirportTimeComparison(
  airportTimeZone: string,
  browserTimeZone: string,
  instant = new Date(),
  locale = "en",
) {
  const clock = (rawTimeZone: string) => {
    const timeZone = rawTimeZone.trim();
    const time = formatAirportLocalTime(timeZone, instant);
    return {
      ...time,
      timeZone: time.zone ? timeZone : "",
      date: time.zone
        ? new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium" }).format(instant)
        : "",
    };
  };
  const airport = clock(airportTimeZone);
  const browser = clock(browserTimeZone);
  const airportOffset = offsetMinutes(airport.zone);
  const browserOffset = offsetMinutes(browser.zone);
  return {
    airport,
    browser,
    differenceMinutes: airportOffset == null || browserOffset == null
      ? null
      : airportOffset - browserOffset,
  };
}

export function useAirportTimeComparison(airportTimeZone: string, locale: string) {
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = useMinuteClock(`${airportTimeZone}|${browserTimeZone}`);
  return useMemo(
    () => formatAirportTimeComparison(airportTimeZone, browserTimeZone, now, locale),
    [airportTimeZone, browserTimeZone, now, locale],
  );
}
