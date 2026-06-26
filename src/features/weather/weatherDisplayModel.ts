// Display helpers for the redesigned weather state (METAR + Local views).
// These map raw weather values onto the visual language: a category/temperature
// colour for the hero card, decoded readouts, and a weather glyph. Colour is
// DATA-encoded here (flight-rules category, temperature) — distinct from the
// product's single orange signal accent, which weather never uses.

// ── Flight rules ────────────────────────────────────────────────────────────
// One colour per category, keyed so the hero rail / tint / value all derive
// from it. Mid-lightness so it reads on both the light and dark frosted tints.
export const FLIGHT_RULE_SEQUENCE = ["VFR", "MVFR", "IFR", "LIFR"] as const;

const FLIGHT_RULE_COLORS: Record<string, string> = {
  VFR: "oklch(0.62 0.13 158)", // mint / green — ok state
  MVFR: "oklch(0.58 0.13 245)", // blue
  IFR: "oklch(0.58 0.17 25)", // red
  LIFR: "oklch(0.56 0.18 330)", // magenta
};

export function flightRuleColor(category: string | null | undefined) {
  if (!category) return "var(--atc-dim)";
  return FLIGHT_RULE_COLORS[category] || "var(--atc-dim)";
}

// ── Temperature → colour scale ──────────────────────────────────────────────
// Cool teal → amber → warm orange, mapped onto the temperature so the Local
// hero is data-encoded. Below ~5°C clamps to teal, above ~25°C to orange.
const TEMP_STOPS: Array<[number, [number, number, number]]> = [
  [5, [0x4f, 0x9e, 0x8f]], // teal
  [15, [0xc7, 0xa9, 0x58]], // amber
  [25, [0xbf, 0x6a, 0x2a]], // orange
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

export function temperatureColor(celsius: number | null | undefined) {
  if (celsius == null || !Number.isFinite(Number(celsius))) {
    return "var(--atc-dim)";
  }
  const t = Number(celsius);
  if (t <= TEMP_STOPS[0][0]) return rgb(TEMP_STOPS[0][1]);
  const last = TEMP_STOPS[TEMP_STOPS.length - 1];
  if (t >= last[0]) return rgb(last[1]);
  for (let i = 0; i < TEMP_STOPS.length - 1; i++) {
    const [lo, loColor] = TEMP_STOPS[i];
    const [hi, hiColor] = TEMP_STOPS[i + 1];
    if (t >= lo && t <= hi) {
      const k = (t - lo) / (hi - lo);
      return rgb([
        lerp(loColor[0], hiColor[0], k),
        lerp(loColor[1], hiColor[1], k),
        lerp(loColor[2], hiColor[2], k),
      ]);
    }
  }
  return rgb(last[1]);
}

function rgb([r, g, b]: [number, number, number]) {
  return `rgb(${r} ${g} ${b})`;
}

// Position of a temperature within a comfortable day range, for the hero's
// progress bar. Clamped to [0.05, 0.98] so the marker never hugs the edge.
export function temperatureRangePct(
  celsius: number | null | undefined,
  min = -5,
  max = 38,
) {
  if (celsius == null || !Number.isFinite(Number(celsius))) return null;
  const pct = (Number(celsius) - min) / (max - min);
  return Math.min(0.98, Math.max(0.05, pct));
}

// ── Relative humidity from temperature + dewpoint (Magnus formula) ───────────
export function relativeHumidity(
  tempC: number | null | undefined,
  dewC: number | null | undefined,
) {
  const t = Number(tempC);
  const d = Number(dewC);
  if (!Number.isFinite(t) || !Number.isFinite(d)) return null;
  const a = 17.625;
  const b = 243.04;
  const rh =
    100 * (Math.exp((a * d) / (b + d)) / Math.exp((a * t) / (b + t)));
  return Math.min(100, Math.max(0, Math.round(rh)));
}

// ── Ceiling code (e.g. "BKN250") from the cloud layers ───────────────────────
export function ceilingCode(metar: any) {
  const layers: Array<{ cover?: string; base?: number | null }> =
    metar?.rawClouds || [];
  const significant = layers.find((l) =>
    ["BKN", "OVC", "VV"].includes(String(l.cover)),
  );
  // No broken/overcast/obscured layer ⇒ no operational ceiling.
  if (!significant) return "CLR";
  if (significant.base == null) return String(significant.cover);
  const hundreds = String(Math.round(Number(significant.base) / 100)).padStart(
    3,
    "0",
  );
  return `${significant.cover}${hundreds}`;
}

// ── UV index level word ──────────────────────────────────────────────────────
export function uvLevelKey(uv: number | null | undefined) {
  if (uv == null || !Number.isFinite(Number(uv))) return "";
  const v = Number(uv);
  if (v < 3) return "weather.uv.low";
  if (v < 6) return "weather.uv.moderate";
  if (v < 8) return "weather.uv.high";
  if (v < 11) return "weather.uv.veryHigh";
  return "weather.uv.extreme";
}

// ── WMO weather code → glyph key (resolved to a lucide icon at the call site) ─
export type WeatherGlyphKey =
  | "sun"
  | "moon"
  | "cloudSun"
  | "cloudMoon"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export function weatherGlyphKey(
  code: number | null | undefined,
  isDay = true,
): WeatherGlyphKey {
  const c = Number(code);
  if (!Number.isFinite(c)) return isDay ? "sun" : "moon";
  if (c === 0) return isDay ? "sun" : "moon";
  if (c === 1) return isDay ? "sun" : "moon";
  if (c === 2) return isDay ? "cloudSun" : "cloudMoon";
  if (c === 3) return "cloud";
  if (c === 45 || c === 48) return "fog";
  if (c >= 51 && c <= 57) return "drizzle";
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return "snow";
  if (c >= 95) return "thunder";
  return "cloud";
}

// ── Local plain-language trend (from the hourly window) ──────────────────────
export function temperatureTrendKey(
  currentC: number | null | undefined,
  hourly: Array<{ temperatureC: number | null }> | undefined,
) {
  if (currentC == null || !hourly || hourly.length < 2) return "";
  const future = hourly[hourly.length - 1]?.temperatureC;
  if (future == null) return "";
  const delta = Number(future) - Number(currentC);
  if (delta <= -2) return "weather.trend.cooling";
  if (delta >= 2) return "weather.trend.warming";
  return "weather.trend.steady";
}

// Whether the upcoming hours carry a meaningful precip chance, for the summary.
export function upcomingPrecip(
  hourly: Array<{ precipitationProbability: number | null }> | undefined,
) {
  if (!hourly) return false;
  return hourly.some((h) => Number(h.precipitationProbability) >= 40);
}
