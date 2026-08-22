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

export function useAirportLocalTime(timeZone: unknown): AirportLocalTime {
  const normalizedTimeZone = String(timeZone || "").trim();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    if (!normalizedTimeZone) return undefined;

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
  }, [normalizedTimeZone]);

  return useMemo(
    () => formatAirportLocalTime(normalizedTimeZone, now),
    [normalizedTimeZone, now],
  );
}
