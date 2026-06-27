import type {
  AltitudeUnit,
  DistanceUnit,
  TemperatureUnit,
} from "@/features/app-shell/unitPreferences/unitPreferencesModel";

const NM_TO_KM = 1.852;
const NM_TO_MI = 1.15077945;
const FT_TO_M = 0.3048;
const MS_TO_KMH = 3.6;
const MS_TO_MPH = 2.2369362921;

// Here-mode ground speed is a pedestrian/driver readout, deliberately decoupled
// from the aviation distance unit: it has its own two-state toggle, km/h by
// default and mph on tap, and never knots.
export type GroundSpeedUnit = "kmh" | "mph";

const GROUND_SPEED_LABELS: Record<GroundSpeedUnit, string> = {
  kmh: "km/h",
  mph: "mph",
};

const DISTANCE_LABELS: Record<DistanceUnit, string> = {
  nm: "NM",
  mi: "mi",
  km: "km",
};

const TEMPERATURE_LABELS: Record<TemperatureUnit, string> = {
  c: "°C",
  f: "°F",
};

const ALTITUDE_LABELS: Record<AltitudeUnit, string> = {
  ft: "ft",
  m: "m",
  fl: "FL",
};

export function distanceUnitLabel(unit: DistanceUnit) {
  return DISTANCE_LABELS[unit] ?? DISTANCE_LABELS.nm;
}

export function temperatureUnitLabel(unit: TemperatureUnit) {
  return TEMPERATURE_LABELS[unit] ?? TEMPERATURE_LABELS.c;
}

export function altitudeUnitLabel(unit: AltitudeUnit) {
  return ALTITUDE_LABELS[unit] ?? ALTITUDE_LABELS.ft;
}

export function convertDistanceFromNm(nm: number, unit: DistanceUnit) {
  if (!Number.isFinite(nm)) return nm;
  if (unit === "km") return nm * NM_TO_KM;
  if (unit === "mi") return nm * NM_TO_MI;
  return nm;
}

export function convertTemperatureFromC(celsius: number, unit: TemperatureUnit) {
  if (!Number.isFinite(celsius)) return celsius;
  if (unit === "f") return celsius * 1.8 + 32;
  return celsius;
}

export function convertAltitudeFromFt(ft: number, unit: AltitudeUnit) {
  if (!Number.isFinite(ft)) return ft;
  if (unit === "m") return ft * FT_TO_M;
  // Flight levels are 100s of feet; converted by the formatter so the
  // numeric value isn't lossy when callers ask for the raw conversion.
  if (unit === "fl") return ft / 100;
  return ft;
}

interface FormattedValue {
  value: number | null;
  unit: string;
  text: string | null;
  // Optional prefix string rendered before the animated number (e.g. "FL "
  // for flight levels). Callers can keep the number on NumberFlow and the
  // prefix static so unit-switch transitions tween cleanly.
  prefix?: string;
}

interface FormatDistanceOptions {
  precision?: "auto" | number;
  // Below this distance (in the displayed unit, after rounding) callers get
  // back `text: "<1"` so badges read "<1 NM" instead of "0 NM" for hovers.
  showSubOneAs?: string | null;
}

// Formats a distance originally measured in nautical miles. Returns a structured
// object so callers can lay out the number / unit separately (matches existing
// formatNearbyDistanceDisplay shape).
export function formatDistance(
  nm: unknown,
  unit: DistanceUnit,
  { precision = "auto", showSubOneAs = "<1" }: FormatDistanceOptions = {},
): FormattedValue | null {
  if (nm == null || nm === "") return null;
  const numeric = Number(nm);
  if (!Number.isFinite(numeric)) return null;
  const converted = convertDistanceFromNm(Math.max(0, numeric), unit);
  const display = round(converted, precision);
  if (display < 1 && showSubOneAs != null) {
    return { value: null, unit: distanceUnitLabel(unit), text: showSubOneAs };
  }
  return { value: display, unit: distanceUnitLabel(unit), text: null };
}

interface FormatTemperatureOptions {
  precision?: "auto" | number;
}

export function formatTemperature(
  celsius: unknown,
  unit: TemperatureUnit,
  { precision = "auto" }: FormatTemperatureOptions = {},
): FormattedValue | null {
  if (celsius == null || celsius === "") return null;
  const numeric = Number(celsius);
  if (!Number.isFinite(numeric)) return null;
  const converted = convertTemperatureFromC(numeric, unit);
  return {
    value: round(converted, precision),
    unit: temperatureUnitLabel(unit),
    text: null,
  };
}

interface FormatAltitudeOptions {
  precision?: "auto" | number;
  // FL display can be misleading at low altitudes (e.g. a plane at 200 ft as
  // "FL2"). Pass kind="ground" for elevations / ceilings so they fall back to
  // ft (or m if the user picked m). Default "cruise" honors the user pref.
  kind?: "cruise" | "ground";
  flMinimumFt?: number;
}

export function formatAltitude(
  ft: unknown,
  unit: AltitudeUnit,
  {
    precision = "auto",
    kind = "cruise",
    flMinimumFt = 1000,
  }: FormatAltitudeOptions = {},
): FormattedValue | null {
  if (ft == null || ft === "") return null;
  const numeric = Number(ft);
  if (!Number.isFinite(numeric)) return null;

  if (unit === "fl") {
    if (kind === "ground" || numeric < flMinimumFt) {
      return {
        value: Math.round(numeric),
        unit: altitudeUnitLabel("ft"),
        text: null,
      };
    }
    const fl = Math.round(numeric / 100);
    return {
      value: fl,
      unit: "",
      text: null,
      prefix: "FL ",
    };
  }

  if (unit === "m") {
    return {
      value: round(convertAltitudeFromFt(numeric, "m"), precision),
      unit: altitudeUnitLabel("m"),
      text: null,
    };
  }

  return {
    value: Math.round(numeric),
    unit: altitudeUnitLabel("ft"),
    text: null,
  };
}

// Altitude as reported by the Geolocation API is in metres above the WGS84
// ellipsoid; reuse the foot-based formatter (and its unit handling) by
// converting first. Returns null for the common indoor/desktop case where the
// device reports no altitude.
export function formatAltitudeFromMeters(
  meters: unknown,
  unit: AltitudeUnit,
  options: FormatAltitudeOptions = {},
): FormattedValue | null {
  if (meters == null || meters === "") return null;
  const numeric = Number(meters);
  if (!Number.isFinite(numeric)) return null;
  return formatAltitude(numeric / FT_TO_M, unit, options);
}

export function groundSpeedUnitLabel(unit: GroundSpeedUnit) {
  return GROUND_SPEED_LABELS[unit] ?? GROUND_SPEED_LABELS.kmh;
}

// Here-mode speed has no preference of its own, so its *default* follows the
// user's broader metric/imperial choice rather than being forced to km/h:
// km/h when their units read metric, mph when imperial. Distance is the primary
// signal (speed is distance over time); nautical miles — the aviation default,
// which is neither system — falls back to the altitude unit. The here-mode tap
// toggle still overrides this per session.
export function defaultGroundSpeedUnit(units: {
  distance: DistanceUnit;
  altitude: AltitudeUnit;
}): GroundSpeedUnit {
  if (units.distance === "km") return "kmh";
  if (units.distance === "mi") return "mph";
  if (units.altitude === "m") return "kmh";
  if (units.altitude === "ft") return "mph";
  return "kmh";
}

export function convertSpeedFromMps(mps: number, unit: GroundSpeedUnit) {
  if (!Number.isFinite(mps)) return mps;
  return unit === "mph" ? mps * MS_TO_MPH : mps * MS_TO_KMH;
}

// Formats a ground speed measured in metres per second (Geolocation API) into
// the here-mode km/h or mph readout. Negative/no-fix speeds collapse to null.
export function formatGroundSpeed(
  mps: unknown,
  unit: GroundSpeedUnit,
): FormattedValue | null {
  if (mps == null || mps === "") return null;
  const numeric = Number(mps);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return {
    value: Math.round(convertSpeedFromMps(numeric, unit)),
    unit: groundSpeedUnitLabel(unit),
    text: null,
  };
}

function round(value: number, precision: "auto" | number): number {
  if (precision === "auto") {
    if (Math.abs(value) >= 100) return Math.round(value);
    if (Math.abs(value) >= 10) return Math.round(value * 10) / 10;
    return Math.round(value * 10) / 10;
  }
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
