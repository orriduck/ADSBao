// Resolves a CSS-mask-friendly silhouette URL for an aircraft based on its
// ADS-B `type` field (the ICAO type designator, e.g. "A320", "B738", "CRJ9").
//
// Icons live on disk under `public/icons/aircraft/<name>.svg` and are served
// same-origin by `src/app/api/icons/aircraft/[name]/route.js` so CSS
// `mask-image` tinting works without CORS friction. When a type isn't on disk
// the API route falls back to an inline arrow SVG.
//
// Silhouette set is RexKramer1/AircraftShapesSVG (GPL-3.0). See
// `public/icons/aircraft/LICENSE-GPL-3.0.txt` and `ATTRIBUTION.md`.
//
// The resolver favours a direct ICAO match (more specific) before falling
// back to a small family-pattern table for variants that aren't in the set.
// Returning `null` means "no silhouette match" — the caller renders the
// arrow/dot baseline.

export const AIRCRAFT_ICON_BASE_PATH = "/api/icons/aircraft";

// Canonical list of icon names available on disk. Used by the API route to
// allowlist incoming names (preventing path traversal) and by the resolver
// for direct lookup. Names are lowercase, no extension.
export const AIRCRAFT_ICON_NAMES = Object.freeze([
  "a10", "a124", "a19n", "a20n", "a21n", "a225", "a306", "a310", "a318",
  "a320", "a321", "a332", "a333", "a337", "a338", "a339", "a342", "a343",
  "a345", "a346", "a359", "a35k", "a388", "a3st", "a4", "a400", "ajet",
  "an12", "an26", "as21", "as32", "as65", "at45", "at75", "atp",
  "b1", "b190", "b29", "b350", "b38m", "b39m", "b52", "b703", "b712",
  "b722", "b733", "b734", "b735", "b737", "b738", "b739", "b742", "b744",
  "b748", "b74s", "b752", "b753", "b762", "b763", "b764", "b772", "b773",
  "b779", "b77l", "b77w", "b788", "b789", "b78x", "ball", "bcs1", "bcs3",
  "blcf", "bn2p",
  "c130", "c160", "c17", "c172", "c2", "c208", "c25b", "c295", "c5m", "c750",
  "cl2t", "cn35", "crj2", "crj7", "crj9", "crjx",
  "d228", "d328", "da42", "dc10", "dc3", "dc87", "dh8c", "dh8d", "do27",
  "do28",
  "e170", "e195", "e300", "e35l", "e390", "e3cf", "e3tf", "e737", "e8",
  "ec20", "ec35", "ec45", "eufi",
  "f15", "f16", "f18h", "f18s", "f22", "f35", "f406", "f5", "f50", "fa7x",
  "gazl", "gl5t", "glf6", "gyro",
  "h47", "h60", "h64", "hawk", "hunt",
  "il62", "il76",
  "j328",
  "k35e", "kc2", "kc46",
  "l159", "lj35", "lynx",
  "m326", "md11", "mi24", "mira", "mrf1",
  "nh90",
  "p1", "p180", "p28a", "p3", "p8", "pa46", "pc12", "pc6t", "pc9",
  "q4",
  "r135", "r44", "rfal", "rj85",
  "s61", "sb39", "sc7", "sf25", "sf34", "sgup", "sr22", "st75", "su95",
  "t204", "t38", "tigr", "tor",
  "u2", "uh1", "unidentified",
  "v22", "vf35",
]);

const ICON_NAME_SET = new Set(AIRCRAFT_ICON_NAMES);

export function isKnownAircraftIconName(name) {
  return typeof name === "string" && ICON_NAME_SET.has(name);
}

const iconUrl = (name) => `${AIRCRAFT_ICON_BASE_PATH}/${name}`;

// Family fallbacks for ICAO type designators that aren't shipped as direct
// SVGs. Each target name must exist in AIRCRAFT_ICON_NAMES — the closest
// visual analogue for variants the set doesn't cover individually.
const TYPE_PATTERNS = [
  // Boeing 737 family fill-ins (B73G/C/Q etc. -> b737)
  [/^B73[0-2C-Z]$/, "b737"],
  // 747 variants not directly named
  [/^B74[0-15-9LR]$/, "b744"],
  // 757 — direct b752 / b753 exist; others share b753
  [/^B75\w?$/, "b753"],
  // 767 variants not directly named
  [/^B76[0-15-9]$/, "b763"],
  // 777 variants not directly named
  [/^B77[0-15-9]$/, "b772"],
  // 787 variants not directly named
  [/^B78[0-79A-Z]$/, "b788"],

  // Airbus narrow-body
  [/^A319$/, "a318"],
  [/^A32\w$/, "a320"],
  // Airbus wide-body
  [/^A33\d$/, "a332"],
  [/^A34\d$/, "a342"],
  [/^A35\w$/, "a359"],
  [/^A38\d$/, "a388"],

  // McDonnell Douglas / Lockheed heavy
  [/^MD8\d$/, "md11"],
  [/^MD9\d$/, "md11"],
  [/^DC9\w?$/, "md11"],
  [/^L101$/, "md11"],

  // Bombardier CRJ
  [/^CRJ\d?$/, "crjx"],

  // Dash 8 family fill-in (dh8a/b -> dh8c)
  [/^DH8\w?$/, "dh8c"],

  // Embraer E-Jets
  [/^E17\d$/, "e170"],
  [/^E19\d$/, "e195"],
  [/^E29\d$/, "e195"],
  // ERJ-135/140/145
  [/^E1[345]\d$/, "e35l"],
  [/^ERJ\w*$/, "e35l"],

  // Fokker (no f100 in the set — closest narrow-body twin in size class)
  [/^F100$/, "f50"],
  [/^F70$/, "f50"],

  // Dassault Falcon
  [/^F2TH$/, "fa7x"],
  [/^F900$/, "fa7x"],

  // Gulfstream / Bombardier Global
  [/^GLF[1-6]$/, "glf6"],
  [/^GLEX$/, "glf6"],
  [/^G(150|250|280|350|450|500|550|600|650|700)$/, "glf6"],

  // Bombardier Learjet
  [/^LJ\d{2}$/, "lj35"],

  // Military fighters that aren't direct
  [/^F-?14\w?$/, "f15"],
  [/^F-?18\w?$/, "f18h"],

  // Cessna single-engine pistons -> c172
  [/^C(150|152|162|172|175|177|180|182|185|205|206|207|208|210)$/, "c172"],
  // Cessna Citation jets -> c25b
  [/^C(25[1-9A-Z]|5[0-9]{2}|6[0-9]{2}|7[0-4][0-9])$/, "c25b"],
];

// Wake-class category fallback when the aircraft has no usable type code.
// Targets must exist in AIRCRAFT_ICON_NAMES. Categories outside A1–A7 (A0
// "no info", B* / C*) fall through to null so the caller draws the arrow.
const CATEGORY_ICONS = {
  A1: "c172",  // light piston single
  A2: "c25b",  // small business jet
  A3: "a320",  // large narrow-body
  A4: "b753",  // high-vortex large (757-class)
  A5: "b77w",  // heavy wide-body
  A6: "f16",   // high-performance / fighter
  A7: "h60",   // rotorcraft
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
 * Tries the ICAO type designator first (direct match, then family fallback),
 * then falls back to the ADS-B emitter category for traffic that doesn't
 * broadcast a usable type code. Returns `null` when nothing matches — the
 * caller draws the generic arrow marker.
 *
 * @param {{ type?: string, category?: string }} aircraft
 * @returns {{ src: string, name: string, source: 'type' | 'category' } | null}
 */
export function resolveAircraftIcon(aircraft = {}) {
  const type = normalizeKey(aircraft.type);
  if (type) {
    const directName = type.toLowerCase();
    if (ICON_NAME_SET.has(directName)) {
      return { src: iconUrl(directName), name: directName, source: "type" };
    }
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
