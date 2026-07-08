// Pure environmental-shading model for the aircraft canvas renderer: a
// weather-driven ambient "mood" (feeds palette lookup) and a simplified,
// deliberately-not-astronomical light bearing (feeds the 4-direction gradient
// mask picked in aircraftLightMask.ts). Kept framework/canvas-free so the
// mapping and hysteresis math are unit-testable without a browser.
//
// This is a distinct, narrower thing than a real day/night terminator: the
// light bearing here is a linear East->West sweep over the LOCATION's local
// clock, not a solar-position calculation. That's an explicit, user-approved
// simplification for this ambient glyph-shading effect only.
//
// "Location's local clock" — not the browser's. Every time-of-day input here
// takes a longitude and derives local time from UTC + a coarse 15deg-per-hour
// offset (no timezone/DST database, another deliberate simplification). Using
// the viewer's own device timezone was a real bug: an airport on the other
// side of the world would render "night" colours just because the viewer's
// clock said so, regardless of what time it actually was there.
function resolveLocalHour(nowMs: number, lonDeg: number): number {
  const date = new Date(nowMs);
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const offsetHours = lonDeg / 15;
  return (((utcHour + offsetHours) % 24) + 24) % 24;
}

export type WeatherMood = "clear" | "overcast" | "severe";

const OVERCAST_CLOUD_COVER_PCT = 70;

// Weather -> ambient mood. Flight-rules category takes priority (it already
// captures the "how bad is it" signal pilots use); cloud cover is a fallback
// for callers that only have Open-Meteo data (e.g. here-mode with no nearby
// METAR station yet). VFR/MVFR are visually merged into "overcast" only when
// cloud cover is heavy — otherwise both read as "clear" ambience, since the
// mood is meant to convey a coarse atmosphere, not the four-way FAA category.
export function resolveWeatherMood(
  flightCategory: unknown,
  cloudCoverPct: unknown = null,
): WeatherMood {
  const category = String(flightCategory || "").trim().toUpperCase();
  if (category === "IFR" || category === "LIFR") return "severe";
  if (category === "MVFR") return "overcast";
  const cloudCover = Number(cloudCoverPct);
  if (Number.isFinite(cloudCover) && cloudCover >= OVERCAST_CLOUD_COVER_PCT) {
    return "overcast";
  }
  return "clear";
}

const DAWN_HOUR = 6;
const DUSK_HOUR = 18;
const DAWN_BEARING_DEG = 90;
const DUSK_BEARING_DEG = 270;

// Simplified light source bearing: sweeps linearly from due-east at dawn to
// due-west at dusk using the LOCATION's local clock (derived from longitude —
// see resolveLocalHour above), clamping outside that window. Not
// solar-accurate (no latitude/season/declination) — that precision belongs
// to a real day/night terminator overlay, a separate, deferred feature. This
// is intentionally just "does the sun feel like it's behind me or ahead of
// me right now, at this location".
export function simplifiedLightBearingDeg(nowMs: number, lonDeg = 0): number {
  const hour = resolveLocalHour(nowMs, lonDeg);
  if (hour <= DAWN_HOUR) return DAWN_BEARING_DEG;
  if (hour >= DUSK_HOUR) return DUSK_BEARING_DEG;
  const t = (hour - DAWN_HOUR) / (DUSK_HOUR - DAWN_HOUR);
  return DAWN_BEARING_DEG + t * (DUSK_BEARING_DEG - DAWN_BEARING_DEG);
}

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

// Time-of-day colour-temperature bucket — a SEPARATE ambient dimension from
// the light-direction bearing above (that one drives the highlight/shadow
// mask; this one drives hue, so aircraft actually read as "morning gold" /
// "midday neutral" / "sunset amber" / "night blue" at a glance, layered with
// the weather mood in AircraftCanvasLayer's colour table). Location-local
// hours (see resolveLocalHour), same simplification stance as
// simplifiedLightBearingDeg — not tied to actual sunrise/sunset times.
const TIME_OF_DAY_BOUNDARIES: Array<[number, TimeOfDay]> = [
  [5, "night"],
  [8, "dawn"],
  [17, "day"],
  [20, "dusk"],
  [24, "night"],
];

export function resolveTimeOfDayBucket(nowMs: number, lonDeg = 0): TimeOfDay {
  const hour = resolveLocalHour(nowMs, lonDeg);
  for (const [beforeHour, bucket] of TIME_OF_DAY_BOUNDARIES) {
    if (hour < beforeHour) return bucket;
  }
  return "night";
}

// Shared hue-per-time-of-day table for every ambient colour derived from
// TimeOfDay (aircraft rest colour AND the map-level wash below) so both read
// as the same "sky colour" progression instead of two uncoordinated palettes.
//
// Hue MUST stay clear of --atc-signal-accent (oklch(0.66 0.16 50), the single
// reserved orange for focal/tracked targets) — an earlier pass used warm hues
// near 35-55 for dawn/dusk and, in production, painted the ENTIRE map (every
// aircraft + label) the same orange as the one thing that's supposed to stand
// out, destroying the whole "one accent colour" hierarchy. This palette keeps
// a >=60deg hue gap from 50 in every direction: dawn blush -> daytime cyan ->
// twilight violet -> night blue.
export const TIME_OF_DAY_HUE: Record<TimeOfDay, number> = {
  dawn: 350, // soft rose/blush sunrise sky
  day: 180, // cool daytime cyan-sky
  dusk: 290, // twilight violet
  night: 240, // night blue
};

// Map-level ambient wash: a colour tint over the base map imagery only (see
// AmbientWashLayer.tsx — it renders in a pane just above the tile layer and
// below every annotation/aircraft pane), so the whole viewport picks up the
// same time-of-day/weather atmosphere instead of leaving it confined to the
// tiny aircraft glyphs. A first pass here used much lower chroma/alpha on the
// theory that a full-viewport wash needs less than a 20px glyph — verified by
// compositing over a representative terrain colour, that came out within a
// few RGB units across every combination and read as flatly invisible, the
// same mistake the aircraft tint made before ITS chroma got raised. These
// values are tuned so adjacent combinations differ by double-digit RGB units
// once composited (checked numerically, not just by eye), while staying a
// wash rather than a solid colour cast — severe weather still tops out well
// under 50% alpha.
const OVERLAY_MOOD_CHROMA: Record<WeatherMood, number> = {
  clear: 0.1,
  overcast: 0.07,
  severe: 0.04,
};
const OVERLAY_LIGHTNESS_DARK: Record<WeatherMood, number> = {
  clear: 0.36,
  overcast: 0.3,
  severe: 0.24,
};
const OVERLAY_LIGHTNESS_LIGHT: Record<WeatherMood, number> = {
  clear: 0.86,
  overcast: 0.8,
  severe: 0.72,
};
// Overcast/severe read as heavier (more atmosphere-in-the-way), not just a
// hue change — mirrors how the aircraft mood chroma already dims for worse
// weather, applied here as opacity since this wash's chroma stays modest.
// Bumped again after user feedback that the map/aircraft colour difference
// still wasn't obvious enough at real map scale — severe still stays under
// ~55% so it reads as an atmospheric wash, not a solid colour cast.
const OVERLAY_MOOD_ALPHA: Record<WeatherMood, number> = {
  clear: 0.3,
  overcast: 0.4,
  severe: 0.52,
};

// Time-of-day DEPTH for the wash. The mood tables above set the colour family
// and weather weight; these carry the sky's hour. In LIGHT theme the map must
// stay legible (roads, coastline, terrain), so the atmosphere comes mostly
// from the raised chroma above — brightness only eases down gently through the
// day and drops meaningfully at NIGHT (where a darker map genuinely reads
// better); a heavier dusk dim was tried and flattened the whole map to one
// muddy tone. DARK theme is already dark, so it only deepens a little at night
// and lifts a touch at midday.
const WASH_TOD_LIGHTNESS_DELTA_LIGHT: Record<TimeOfDay, number> = {
  day: 0.02,
  dawn: -0.02,
  dusk: -0.04,
  night: -0.14,
};
const WASH_TOD_LIGHTNESS_DELTA_DARK: Record<TimeOfDay, number> = {
  day: 0.05,
  dawn: -0.01,
  dusk: -0.04,
  night: -0.1,
};
const WASH_TOD_ALPHA_SCALE: Record<TimeOfDay, number> = {
  day: 0.72,
  dawn: 0.85,
  dusk: 0.9,
  night: 1.1,
};
// Hard ceiling so even severe x night stays an atmospheric wash, never an
// opaque colour cast.
const WASH_ALPHA_MAX = 0.6;

const clamp01 = (value: number, min = 0.04, max = 0.98) =>
  Math.min(max, Math.max(min, value));

export interface AmbientOverlayColor {
  /** Opaque oklch() colour string — pass as fillColor, not as a CSS background alone. */
  color: string;
  /** Separate 0-1 alpha — kept apart from `color` so callers can't accidentally double-apply alpha. */
  opacity: number;
}

export function resolveAmbientOverlayColor(
  mood: WeatherMood,
  timeOfDay: TimeOfDay,
  dark: boolean,
): AmbientOverlayColor {
  const hue = TIME_OF_DAY_HUE[timeOfDay];
  const chroma = OVERLAY_MOOD_CHROMA[mood];
  const baseLightness = dark ? OVERLAY_LIGHTNESS_DARK[mood] : OVERLAY_LIGHTNESS_LIGHT[mood];
  const todDelta = dark
    ? WASH_TOD_LIGHTNESS_DELTA_DARK[timeOfDay]
    : WASH_TOD_LIGHTNESS_DELTA_LIGHT[timeOfDay];
  const lightness = clamp01(baseLightness + todDelta);
  const opacity = Math.min(
    WASH_ALPHA_MAX,
    OVERLAY_MOOD_ALPHA[mood] * WASH_TOD_ALPHA_SCALE[timeOfDay],
  );
  return {
    color: `oklch(${lightness} ${chroma} ${hue})`,
    opacity,
  };
}

// Screen-space DIRECTIONAL light gradient — a soft deepening on the side of
// the map facing AWAY from the light source, fading to fully clear on the lit
// side. This is the immersion lever a flat wash can't provide: it adds depth
// and a sense of raking light across the viewport WITHOUT uniformly muddying
// the map's own colours, because the lit side keeps full map fidelity. It's
// driven by the same light bearing as the per-aircraft light masks, so the
// whole scene reads as lit from one coherent direction. Rendered by
// AmbientLightGradientLayer into the same low pane as the wash (above tiles,
// below every annotation/aircraft), so it never tints labels or aircraft.
const GRADIENT_SHADOW_CHROMA_LIGHT = 0.06;
const GRADIENT_SHADOW_CHROMA_DARK = 0.05;
const GRADIENT_SHADOW_LIGHTNESS_LIGHT = 0.34;
const GRADIENT_SHADOW_LIGHTNESS_DARK = 0.12;
// Alpha of the shadow edge by time of day (day is the faintest, night the
// deepest). Split by theme: dark theme can carry a heavier deepening before it
// reads as a smudge; light theme stays gentle so the map keeps its detail.
const GRADIENT_SHADOW_ALPHA_LIGHT: Record<TimeOfDay, number> = {
  day: 0.1,
  dawn: 0.24,
  dusk: 0.3,
  night: 0.38,
};
const GRADIENT_SHADOW_ALPHA_DARK: Record<TimeOfDay, number> = {
  day: 0.16,
  dawn: 0.28,
  dusk: 0.34,
  night: 0.46,
};
const GRADIENT_MOOD_SCALE: Record<WeatherMood, number> = {
  clear: 1,
  overcast: 1.1,
  severe: 1.25,
};
const GRADIENT_SHADOW_ALPHA_MAX = 0.55;

// Returns a CSS `background-image` value: a single linear-gradient whose angle
// matches the light bearing so the shadow sits on the anti-light edge. CSS
// gradient angles and compass bearings share the same convention (0deg = up/
// north, 90deg = right/east, clockwise), so the bearing maps straight through:
// at `${bearing}deg` the 0% stop lands on the (bearing+180) edge — exactly the
// side facing away from the light.
export function resolveAmbientLightGradient(
  mood: WeatherMood,
  timeOfDay: TimeOfDay,
  lightBearingDeg: number,
  dark: boolean,
): string {
  const hue = TIME_OF_DAY_HUE[timeOfDay];
  const chroma = dark ? GRADIENT_SHADOW_CHROMA_DARK : GRADIENT_SHADOW_CHROMA_LIGHT;
  const lightness = dark
    ? GRADIENT_SHADOW_LIGHTNESS_DARK
    : GRADIENT_SHADOW_LIGHTNESS_LIGHT;
  const baseAlpha = dark
    ? GRADIENT_SHADOW_ALPHA_DARK[timeOfDay]
    : GRADIENT_SHADOW_ALPHA_LIGHT[timeOfDay];
  const alpha = Math.min(
    GRADIENT_SHADOW_ALPHA_MAX,
    baseAlpha * GRADIENT_MOOD_SCALE[mood],
  );
  const angle = normalizeDeg(lightBearingDeg);
  const shadow = `oklch(${lightness} ${chroma} ${hue} / ${alpha})`;
  // Shadow holds the anti-light third, fades out by 65% so the lit ~35% of the
  // viewport stays fully clear and keeps full map fidelity.
  return `linear-gradient(${angle}deg, ${shadow} 0%, oklch(${lightness} ${chroma} ${hue} / 0) 65%)`;
}

// Chrome edge accent: feeds the existing --app-floating-edge-shadow token
// (Toolbar.tsx's map-kit halo) and a matching sidebar-edge glow, so the
// floating toolbar and the sidebar's map-facing border pick up a hint of
// the same ambiance. This is deliberately the most restrained consumer of
// the hue table — it sits as a low-lightness "coloured shadow" behind
// chrome that already has to stay legible, not a wash over content. Both
// call sites additionally apply their own ~45% opacity multiplier on top
// (matching the existing toolbar halo), so the effective alpha ends up
// noticeably fainter than the numbers below alone suggest.
const CHROME_EDGE_CHROMA: Record<WeatherMood, number> = {
  clear: 0.07,
  overcast: 0.045,
  severe: 0.025,
};
const CHROME_EDGE_LIGHTNESS: Record<WeatherMood, number> = {
  clear: 0.32,
  overcast: 0.26,
  severe: 0.2,
};
// Dark theme reads a colour glow at a similar strength to its pre-existing
// near-black halo (32% alpha); light theme stays as subtle as its
// pre-existing near-black shadow (7.5% alpha) — a colour cast that loud
// against a light background would compete with legibility.
const CHROME_EDGE_ALPHA_DARK: Record<WeatherMood, number> = {
  clear: 0.3,
  overcast: 0.36,
  severe: 0.42,
};
const CHROME_EDGE_ALPHA_LIGHT: Record<WeatherMood, number> = {
  clear: 0.12,
  overcast: 0.16,
  severe: 0.2,
};

export function resolveAmbientChromeEdgeColor(
  mood: WeatherMood,
  timeOfDay: TimeOfDay,
  dark: boolean,
): string {
  const hue = TIME_OF_DAY_HUE[timeOfDay];
  const chroma = CHROME_EDGE_CHROMA[mood];
  const lightness = CHROME_EDGE_LIGHTNESS[mood];
  const alpha = dark ? CHROME_EDGE_ALPHA_DARK[mood] : CHROME_EDGE_ALPHA_LIGHT[mood];
  return `oklch(${lightness} ${chroma} ${hue} / ${alpha})`;
}

// Chrome surface tint: an opaque colour meant to be `color-mix()`ed into the
// toolbar/sidebar's own surface token at a modest, fixed percentage (the
// call site controls "how much", this controls "which colour") — a
// stronger, more literal reading of "match the map's colour" than the edge
// accent above, which only glows at the rim. Deliberately reuses the map
// wash's own tuning (resolveAmbientOverlayColor) rather than a third table:
// it's already a theme-aware, mood-scaled tint built for blending OVER a
// surface, which is exactly this job too — same "sky colour" family reads
// as one coordinated system instead of the chrome inventing its own look.
export function resolveAmbientChromeSurfaceTint(
  mood: WeatherMood,
  timeOfDay: TimeOfDay,
  dark: boolean,
): string {
  return resolveAmbientOverlayColor(mood, timeOfDay, dark).color;
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Angle of the light source relative to the aircraft's own nose (0deg = light
// dead ahead, 90deg = light off the right side, ...). This is the frame the
// gradient mask must be picked in, since the mask composites AFTER the
// canvas has already been rotated by heading.
export function relativeLightAngleDeg(
  lightBearingDeg: number,
  headingDeg: number,
): number {
  return normalizeDeg(lightBearingDeg - headingDeg);
}

// Quantizes a relative angle into `bucketCount` equal-width buckets centred
// on 0/90/180/270 (for the default 4) — front/right/back/left.
export function lightBucketForRelativeAngle(
  relativeAngleDeg: number,
  bucketCount = 4,
): number {
  const bucketWidthDeg = 360 / bucketCount;
  const normalized = normalizeDeg(relativeAngleDeg);
  return Math.floor((normalized + bucketWidthDeg / 2) / bucketWidthDeg) % bucketCount;
}

function bucketCenterDeg(bucket: number, bucketCount: number): number {
  return (bucket * (360 / bucketCount)) % 360;
}

// Signed-shortest angular distance between two compass angles, in [0, 180].
function angularDistanceDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export interface LightBucketHysteresisOptions {
  bucketCount?: number;
  /**
   * How far the relative angle must drift from the CURRENT bucket's centre
   * (in degrees) before switching buckets. Deliberately larger than half the
   * bucket width (45deg for 4 buckets) so a heading that hovers near a
   * bucket boundary — normal ADS-B track noise — doesn't flip the highlight
   * side every time new data arrives (schmitt-trigger style hysteresis).
   */
  switchThresholdDeg?: number;
}

// Given the raw relative angle and the bucket currently held for this
// aircraft, decide whether to keep it or switch. `previousBucket` is null
// the first time an aircraft is seen (no hysteresis to apply yet).
export function resolveLightBucketWithHysteresis(
  relativeAngleDeg: number,
  previousBucket: number | null,
  { bucketCount = 4, switchThresholdDeg = 58 }: LightBucketHysteresisOptions = {},
): number {
  const normalized = normalizeDeg(relativeAngleDeg);
  if (previousBucket == null) {
    return lightBucketForRelativeAngle(normalized, bucketCount);
  }
  const distanceFromCurrentCenter = angularDistanceDeg(
    normalized,
    bucketCenterDeg(previousBucket, bucketCount),
  );
  if (distanceFromCurrentCenter <= switchThresholdDeg) return previousBucket;
  return lightBucketForRelativeAngle(normalized, bucketCount);
}

// Convenience wrapper for the call site (per-aircraft, per render): combines
// the light-bearing/heading angle with the hysteresis decision in one call.
export function resolveAircraftLightBucket(
  lightBearingDeg: number,
  headingDeg: number,
  previousBucket: number | null,
  options?: LightBucketHysteresisOptions,
): number {
  const relativeAngleDeg = relativeLightAngleDeg(lightBearingDeg, headingDeg);
  return resolveLightBucketWithHysteresis(relativeAngleDeg, previousBucket, options);
}
