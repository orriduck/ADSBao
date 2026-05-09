// Mapping from ADS-B aircraft type designators (the `t` field returned by
// adsb.lol, e.g. "A320", "B738", "CRJ9", "DH8D") and ADS-B emitter categories
// (the `category` field, e.g. "A3", "A7", "B1") to silhouette icons.
//
// Icons live on https://adsb-radar.com/help/icons/<name>.svg and are served
// to the browser via our same-origin proxy at AIRCRAFT_ICON_BASE_PATH so that
// CSS `mask-image` is not subject to cross-origin restrictions. The proxy is
// implemented at `src/app/api/icons/aircraft/[name]/route.js`.
//
// Attribution required by the upstream license:
//   Icons by ADS-B Radar for macOS — https://adsb-radar.com
//
// The resolver favours the type designator (more specific) before falling
// back to the emitter category. Returning `null` means "no silhouette match" —
// the caller should keep using the arrow / dot fallback.

export const AIRCRAFT_ICON_BASE_PATH = "/api/icons/aircraft";

// Canonical list of icon names available upstream. Used both by the resolver
// and by the proxy route to allowlist requests (prevents SSRF / arbitrary
// path traversal). Keep names lowercase, no extension.
export const AIRCRAFT_ICON_NAMES = Object.freeze([
  // ADS-B emitter categories
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
  "a7",
  "b0",
  "b1",
  "b2",
  "b3",
  "b4",
  "c0",
  // Airbus
  "a320",
  "a330",
  "a340",
  "a380",
  // Boeing
  "b737",
  "b747",
  "b767",
  "b777",
  "b787",
  // Other commercial
  "c130",
  "cessna",
  "crjx",
  "dh8a",
  "e195",
  "erj",
  "f100",
  "fa7x",
  "glf5",
  "learjet",
  "md11",
  // Military fighters
  "f5",
  "f11",
  "f15",
]);

const ICON_NAME_SET = new Set(AIRCRAFT_ICON_NAMES);

export function isKnownAircraftIconName(name) {
  return typeof name === "string" && ICON_NAME_SET.has(name);
}

const iconUrl = (name) => `${AIRCRAFT_ICON_BASE_PATH}/${name}`;

// Ordered list of (regex, icon-name) pairs. The first match wins.
//
// We map families generously: e.g. all 737 variants (B731..B739, B73G…) share
// `b737`, all A330 variants share `a330`, and so on. When we don't have a
// dedicated silhouette (e.g. no B757 icon), we map to the closest visual
// analogue (a long narrow-body twin → b767) rather than dropping to the arrow.
const TYPE_PATTERNS = [
  // Boeing
  [/^B73\w?$/, "b737"], // B731..B739, B73G/C/Q/etc.
  [/^B74\w?$/, "b747"], // B741..B748
  [/^B75\w?$/, "b767"], // B752..B753 — share long narrow-body silhouette
  [/^B76\w?$/, "b767"],
  [/^B77\w?$/, "b777"], // B772, B773, B77L, B77W
  [/^B78\w?$/, "b787"], // B788, B789, B78X

  // Airbus
  [/^A19N$/, "a320"], // A220-100 — closest narrow-body twin
  [/^A2[01]N$/, "a320"], // A20N, A21N (neo)
  [/^A31\d$/, "a320"], // A318, A319
  [/^A32\d?$/, "a320"], // A320, A321
  [/^A33\d$/, "a330"], // A332, A333, A338, A339
  [/^A34\d$/, "a340"], // A342..A346
  [/^A35\w$/, "a330"], // A359, A35K — re-use a330 silhouette
  [/^A38\d$/, "a380"], // A388

  // McDonnell Douglas / Douglas
  [/^MD1[01]$/, "md11"], // MD11, MD10
  [/^DC10$/, "md11"],
  [/^MD8\d$/, "md11"], // MD80..MD88 — closest tri-jet/heavy in set

  // Lockheed
  [/^C130$/, "c130"],
  [/^L101$/, "md11"], // L-1011 TriStar — share md11 silhouette

  // Bombardier CRJ family
  [/^CRJ\w*$/, "crjx"],

  // Bombardier / De Havilland Dash 8
  [/^DH8\w?$/, "dh8a"], // DH8A..DH8D

  // Embraer
  [/^E1[97]\d$/, "e195"], // E190, E195, E170, E175 — share E-Jet silhouette
  [/^E29\d$/, "e195"], // E290, E295 (E2)
  [/^E1[34]5$/, "erj"], // E135, E145
  [/^ERJ\w*$/, "erj"],

  // Fokker
  [/^F100$/, "f100"],
  [/^F70$/, "f100"],

  // Dassault Falcon
  [/^FA7X$/, "fa7x"],
  [/^F2TH$/, "fa7x"], // Falcon 2000
  [/^F900$/, "fa7x"], // Falcon 900

  // Gulfstream
  [/^GLF[1-6]$/, "glf5"], // GLF1..GLF6
  [/^GLEX$/, "glf5"], // Bombardier Global Express
  [/^G(150|250|280|350|450|500|550|600|650|700)$/, "glf5"],

  // Bombardier Learjet
  [/^LJ\d{2}$/, "learjet"], // LJ31..LJ75

  // Military fighters
  [/^F15\w?$/, "f15"],
  [/^F-?5\w?$/, "f5"],
  [/^F-?11\w?$/, "f11"],

  // Cessna single-engine pistons
  [/^C(150|152|162|172|175|177|180|182|185|205|206|207|208|210)$/, "cessna"],
  // Cessna Citation jets — re-use the cessna silhouette as a generic small GA
  [/^C(25[0-9A-Z]|5[0-9]{2}|6[0-9]{2}|7[0-9]{2})$/, "cessna"],
];

// ADS-B emitter category fallback. We deliberately skip A0/B0/C0 ("no info")
// so unknown traffic keeps the arrow/dot rather than picking a default plane.
//
// Categories per RTCA DO-260B / ADS-B emitter category set:
//   A1 = Light (<15.5k lb), A2 = Small, A3 = Large, A4 = High-vortex large,
//   A5 = Heavy, A6 = High performance, A7 = Rotorcraft.
//   B1 = Glider, B2 = LTA, B3 = Parachutist, B4 = Ultralight.
const CATEGORY_ICONS = {
  A1: "a1",
  A2: "a2",
  A3: "a3",
  A4: "a4",
  A5: "a5",
  A6: "a6",
  A7: "a7",
  B1: "b1",
  B2: "b2",
  B3: "b3",
  B4: "b4",
};

const normalizeKey = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

// Wake-class scale factors keyed off the ADS-B emitter category (A-level).
// A1 light → 0.90, A2 small → 0.95, A3 large → 1.00 (baseline), A4 high-vortex
// large → 1.05, A5 heavy → 1.10. Categories outside A1–A5 (A0 unknown,
// A6 high-performance, A7 rotorcraft, B*, C*, missing) keep the baseline so
// shape, not size, carries their signal. Applied to both the silhouette and
// the vector-arrow fallback so the wake class is visible regardless of
// whether we resolved a type-specific icon.
export const AIRCRAFT_BASELINE_SCALE = 1;

const CATEGORY_SIZE_SCALE = {
  A1: 0.9,
  A2: 0.95,
  A3: 1,
  A4: 1.05,
  A5: 1.1,
};

/**
 * Resolve a marker scale factor for an aircraft based on its ADS-B emitter
 * category. Returns `1` for unknown / out-of-range categories so callers can
 * always multiply against this without a null check.
 *
 * @param {{ category?: string }} aircraft
 * @returns {number}
 */
export function resolveAircraftSizeScale(aircraft = {}) {
  const category = normalizeKey(aircraft.category);
  return CATEGORY_SIZE_SCALE[category] ?? AIRCRAFT_BASELINE_SCALE;
}

/**
 * Resolve a silhouette icon URL for a given aircraft.
 *
 * @param {{ type?: string, category?: string }} aircraft
 * @returns {{ src: string, name: string, source: 'type' | 'category' } | null}
 *   Returns `null` when no mapping is found — callers should fall back to the
 *   generic arrow/dot marker so the experience remains backward compatible.
 */
export function resolveAircraftIcon(aircraft = {}) {
  const type = normalizeKey(aircraft.type);
  if (type) {
    for (const [pattern, name] of TYPE_PATTERNS) {
      if (pattern.test(type)) {
        return { src: iconUrl(name), name, source: "type" };
      }
    }
  }

  const category = normalizeKey(aircraft.category);
  if (category && CATEGORY_ICONS[category]) {
    const name = CATEGORY_ICONS[category];
    return { src: iconUrl(name), name, source: "category" };
  }

  return null;
}
