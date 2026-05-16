const RUNWAY_RECORD_SECTION = "P";
const RUNWAY_RECORD_SUBSECTION = "R";

const parseCoordinate = (token, degreeLength) => {
  const hemisphere = token[0];
  const digits = token.slice(1);
  const degrees = Number(digits.slice(0, degreeLength));
  const minutes = Number(digits.slice(degreeLength, degreeLength + 2));
  const secondsDigits = digits.slice(degreeLength + 2);
  const seconds =
    Number(secondsDigits) / 10 ** Math.max(secondsDigits.length - 2, 0);
  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
  const value = degrees + minutes / 60 + seconds / 3600;
  return hemisphere === "S" || hemisphere === "W" ? -value : value;
};

const parseCoordinateMatches = (line) =>
  [...String(line).matchAll(/([NS]\d{8,10})([EW]\d{9,11})/g)]
    .map((match) => {
      const lat = parseCoordinate(match[1], 2);
      const lon = parseCoordinate(match[2], 3);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    })
    .filter(Boolean);

const isAirportLine = (line, airport) =>
  line.startsWith("SUSAP ") && line.slice(6, 10).trim() === airport;

const runwayNumber = (ident) => Number(String(ident).slice(0, 2));

const runwaySuffix = (ident) => String(ident).slice(2);

const normalizeRunwayIdent = (rawIdent) => {
  const match = String(rawIdent || "")
    .trim()
    .match(/^RW(\d{2})([LRC]?)$/);
  if (!match) return null;
  return `${match[1]}${match[2] || ""}`;
};

const reciprocalSuffix = (suffix) => {
  if (suffix === "L") return "R";
  if (suffix === "R") return "L";
  return suffix;
};

export const reciprocalRunwayIdent = (ident) => {
  const number = runwayNumber(ident);
  if (!Number.isInteger(number) || number < 1 || number > 36) return null;
  const reciprocalNumber = ((number + 17) % 36) + 1;
  return `${String(reciprocalNumber).padStart(2, "0")}${reciprocalSuffix(
    runwaySuffix(ident),
  )}`;
};

const runwaySortKey = (end) =>
  `${String(runwayNumber(end.ident)).padStart(2, "0")}${runwaySuffix(end.ident)}`;

const compactRunwayPair = ({ airport, firstEnd, secondEnd }) => {
  const ends = [firstEnd, secondEnd].toSorted((left, right) =>
    runwaySortKey(left).localeCompare(runwaySortKey(right)),
  );
  const id = ends.map((end) => end.ident).join("/");
  return {
    id,
    ends,
    centerline: {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: ends.map((end) => [end.lon, end.lat]),
      },
      properties: {
        id,
        airport,
        source: "FAA CIFP",
        ends: ends.map((end) => end.ident),
      },
    },
  };
};

export function parseFaaCifpRunways({ lines, airport, cycle = "" }) {
  const normalizedAirport = String(airport || "").trim().toUpperCase();
  const runwaysById = new Map();

  for (const line of lines || []) {
    if (!isAirportLine(line, normalizedAirport)) continue;
    if (
      line[12] !== RUNWAY_RECORD_SECTION ||
      line[13] !== RUNWAY_RECORD_SUBSECTION
    ) {
      continue;
    }

    const firstIdent = normalizeRunwayIdent(line.slice(19, 24));
    const secondIdent = firstIdent ? reciprocalRunwayIdent(firstIdent) : null;
    const coordinates = parseCoordinateMatches(line);
    if (!firstIdent || !secondIdent || coordinates.length < 2) continue;

    const runwayPair = compactRunwayPair({
      airport: normalizedAirport,
      firstEnd: {
        ident: firstIdent,
        lat: coordinates[0].lat,
        lon: coordinates[0].lon,
      },
      secondEnd: {
        ident: secondIdent,
        lat: coordinates[1].lat,
        lon: coordinates[1].lon,
      },
    });

    if (!runwaysById.has(runwayPair.id)) {
      runwaysById.set(runwayPair.id, runwayPair);
    }
  }

  return {
    airport: normalizedAirport,
    source: "FAA CIFP",
    cycle,
    runways: [...runwaysById.values()].toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
}

export const buildAirportRunwayMap = parseFaaCifpRunways;
