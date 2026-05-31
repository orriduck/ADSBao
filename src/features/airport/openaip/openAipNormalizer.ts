import { toFiniteNumber } from "../../../utils/math";

const METERS_TO_FEET = 3.280839895;
const METERS_TO_NM = 0.000539956803;
const EARTH_RADIUS_NM = 3440.065;

const AIRPORT_TYPE_LABELS: Record<number, string> = {
  0: "Airport",
  1: "Glider Site",
  2: "Civil Airfield",
  3: "International Airport",
  4: "Military Heliport",
  5: "Military Aerodrome",
  6: "Ultra Light Flying Site",
  7: "Civil Heliport",
  8: "Closed Aerodrome",
  9: "IFR Airport",
  10: "Water Airfield",
  11: "Landing Strip",
  12: "Agricultural Landing Strip",
  13: "Altiport",
};

const AIRSPACE_CLASS_LABELS: Record<number, string> = {
  0: "A",
  1: "B",
  2: "C",
  3: "D",
  4: "E",
  5: "F",
  6: "G",
};

type OpenAipRecord = Record<string, any>;

const cleanString = (value: unknown) => String(value ?? "").trim();

const upperString = (value: unknown) => cleanString(value).toUpperCase();

const firstFinite = (...values: unknown[]) => {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

const metersToFeet = (value: unknown) => {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * METERS_TO_FEET);
};

const frequencyMhz = (frequency: OpenAipRecord | null | undefined) => {
  const value = toFiniteNumber(frequency?.value ?? frequency);
  return Number.isFinite(value) ? value : null;
};

const pointCoordinates = (geometry: OpenAipRecord | null | undefined) => {
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return { lat: null, lon: null };
  }
  const lon = toFiniteNumber(coordinates[0]);
  const lat = toFiniteNumber(coordinates[1]);
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
};

export const openAipAirportCode = (airport: OpenAipRecord | null | undefined) =>
  upperString(airport?.icaoCode || airport?.iataCode || airport?.altIdentifier || airport?._id);

const typeRank = (airport: OpenAipRecord | null | undefined) => {
  if (airport?.type === 3) return 0;
  if (airport?.type === 0 || airport?.type === 9) return 1;
  if (airport?.type === 2) return 2;
  if (airport?.type === 7 || airport?.type === 4) return 4;
  if (airport?.type === 8) return 9;
  return 5;
};

export const rankOpenAipAirports = (
  airports: OpenAipRecord[] = [],
  query: unknown = "",
) => {
  const normalizedQuery = upperString(query);
  const score = (airport: OpenAipRecord) => {
    const icao = upperString(airport?.icaoCode);
    const iata = upperString(airport?.iataCode);
    const alt = upperString(airport?.altIdentifier);
    const name = upperString(airport?.name);
    if (icao === normalizedQuery || iata === normalizedQuery || alt === normalizedQuery) return 0;
    if (icao.startsWith(normalizedQuery) || iata.startsWith(normalizedQuery)) return 1;
    if (name.startsWith(normalizedQuery)) return 2;
    if (name.includes(normalizedQuery)) return 3;
    return 4;
  };

  return [...airports].sort((left, right) => {
    const byScore = score(left) - score(right);
    if (byScore !== 0) return byScore;
    const byType = typeRank(left) - typeRank(right);
    if (byType !== 0) return byType;
    return cleanString(left?.name).localeCompare(cleanString(right?.name));
  });
};

export const mapOpenAipAirport = (airport: OpenAipRecord | null | undefined) => {
  if (!airport) return null;
  const { lat, lon } = pointCoordinates(airport.geometry);
  const icao = upperString(airport.icaoCode);
  const iata = upperString(airport.iataCode);
  const alt = upperString(airport.altIdentifier);
  const code = icao || iata || alt || upperString(airport._id);
  const typeLabel = AIRPORT_TYPE_LABELS[Number(airport.type)] || "Airport";

  return {
    ident: code,
    icao,
    iata,
    code,
    openAipId: airport._id || "",
    name: cleanString(airport.name) || code,
    type: String(airport.type ?? ""),
    type_label: typeLabel,
    city: "",
    country: upperString(airport.country),
    region: "",
    continent: "",
    lat,
    lon,
    elevationFt: metersToFeet(airport.elevation?.value),
    scheduledService: airport.type === 3,
    gpsCode: icao,
    localCode: alt,
    homeLink: "",
    wikipediaLink: "",
    keywords: "",
    source: "openaip",
    updatedAt: airport.updatedAt || "",
  };
};

export const mapOpenAipFrequency = (
  frequency: OpenAipRecord | null | undefined,
  airport: OpenAipRecord | null | undefined = {},
) => {
  if (!frequency) return null;
  return {
    id: frequency._id || `${openAipAirportCode(airport)}:${frequency.value || frequency.name || ""}`,
    airportIdent: openAipAirportCode(airport),
    type: String(frequency.type ?? ""),
    description: cleanString(frequency.name),
    frequencyMhz: frequencyMhz(frequency),
    primary: Boolean(frequency.primary),
    publicUse: frequency.publicUse !== false,
    source: "openaip",
  };
};

const reciprocalDesignator = (designator: unknown) => {
  const match = upperString(designator).match(/^(\d{2})([LRC]?)$/);
  if (!match) return "";
  const number = Number(match[1]);
  const reciprocal = ((number + 17) % 36) + 1;
  const side = { L: "R", R: "L", C: "C", "": "" }[match[2]] ?? "";
  return `${String(reciprocal).padStart(2, "0")}${side}`;
};

const destinationPoint = (lat: number, lon: number, headingDeg: number, distanceNm: number) => {
  const angularDistance = distanceNm / EARTH_RADIUS_NM;
  const heading = (headingDeg * Math.PI) / 180;
  const startLat = (lat * Math.PI) / 180;
  const startLon = (lon * Math.PI) / 180;
  const endLat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance) +
      Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(heading),
  );
  const endLon =
    startLon +
    Math.atan2(
      Math.sin(heading) * Math.sin(angularDistance) * Math.cos(startLat),
      Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(endLat),
    );
  return {
    lat: (endLat * 180) / Math.PI,
    lon: ((((endLon * 180) / Math.PI + 540) % 360) - 180),
  };
};

export const buildOpenAipRunwayMap = (airport: OpenAipRecord | null | undefined) => {
  const mappedAirport = mapOpenAipAirport(airport);
  if (!mappedAirport || !Number.isFinite(mappedAirport.lat) || !Number.isFinite(mappedAirport.lon)) {
    return null;
  }

  const runways = (airport?.runways || [])
    .map((runway: OpenAipRecord) => {
      const designator = upperString(runway.designator);
      const reciprocal = reciprocalDesignator(designator);
      const heading = firstFinite(runway.trueHeading);
      const lengthMeters = firstFinite(runway.dimension?.length?.value);
      if (!designator || !reciprocal || !Number.isFinite(heading) || !Number.isFinite(lengthMeters)) {
        return null;
      }
      const halfLengthNm = (lengthMeters * METERS_TO_NM) / 2;
      const le = destinationPoint(
        mappedAirport.lat,
        mappedAirport.lon,
        (heading + 180) % 360,
        halfLengthNm,
      );
      const he = destinationPoint(mappedAirport.lat, mappedAirport.lon, heading, halfLengthNm);
      const id = `${designator}/${reciprocal}`;
      const ends = [
        { ident: designator, lat: le.lat, lon: le.lon },
        { ident: reciprocal, lat: he.lat, lon: he.lon },
      ];
      return {
        id,
        ends,
        lengthFt: metersToFeet(lengthMeters),
        widthFt: metersToFeet(runway.dimension?.width?.value),
        centerline: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: ends.map((end) => [end.lon, end.lat]),
          },
          properties: {
            id,
            airport: mappedAirport.icao || mappedAirport.ident,
            source: "OpenAIP",
            ends: ends.map((end) => end.ident),
          },
        },
      };
    })
    .filter(Boolean)
    .sort((left: OpenAipRecord, right: OpenAipRecord) => left.id.localeCompare(right.id));

  if (runways.length === 0) return null;
  return {
    airport: mappedAirport.icao || mappedAirport.ident,
    source: "OpenAIP",
    cycle: airport?.updatedAt || "",
    runways,
  };
};

export const mapOpenAipRunway = (
  runway: OpenAipRecord | null | undefined,
  airport: OpenAipRecord | null | undefined = {},
) => {
  if (!runway) return null;
  const designator = upperString(runway.designator);
  return {
    id: runway._id || `${openAipAirportCode(airport)}:${designator}`,
    airportIdent: openAipAirportCode(airport),
    lengthFt: metersToFeet(runway.dimension?.length?.value),
    widthFt: metersToFeet(runway.dimension?.width?.value),
    surface: String(runway.surface?.mainComposite ?? ""),
    lighted: Boolean(runway.pilotCtrlLighting),
    closed: false,
    le: {
      ident: designator,
      lat: null,
      lon: null,
      elevationFt: null,
      headingDegT: firstFinite(runway.trueHeading),
      displacedThresholdFt: null,
    },
    he: {
      ident: reciprocalDesignator(designator),
      lat: null,
      lon: null,
      elevationFt: null,
      headingDegT: firstFinite(runway.trueHeading) == null
        ? null
        : (Number(runway.trueHeading) + 180) % 360,
      displacedThresholdFt: null,
    },
    source: "openaip",
  };
};

export const mapOpenAipNavaid = (navaid: OpenAipRecord | null | undefined) => {
  if (!navaid) return null;
  const { lat, lon } = pointCoordinates(navaid.geometry);
  const mhz = frequencyMhz(navaid.frequency);
  return {
    id: navaid._id || "",
    ident: upperString(navaid.identifier),
    name: cleanString(navaid.name) || upperString(navaid.identifier),
    type: String(navaid.type ?? ""),
    frequencyKhz: Number.isFinite(mhz) ? Math.round(Number(mhz) * 1000) : null,
    lat,
    lon,
    elevationFt: metersToFeet(navaid.elevation?.value),
    country: upperString(navaid.country),
    dme: {
      frequencyKhz: null,
      channel: cleanString(navaid.channel),
    },
    magneticVariationDeg: firstFinite(navaid.magneticDeclination),
    slavedVariationDeg: null,
    usageType: "",
    power: "",
    associatedAirport: "",
    source: "openaip",
  };
};

export const mapOpenAipAirspace = (airspace: OpenAipRecord | null | undefined) => {
  if (!airspace) return null;
  const icaoClass = Number(airspace.icaoClass);
  return {
    id: airspace._id || "",
    name: cleanString(airspace.name),
    type: String(airspace.type ?? ""),
    icaoClass,
    classLabel: AIRSPACE_CLASS_LABELS[icaoClass] || "",
    country: upperString(airspace.country),
    lowerLimit: airspace.lowerLimit || null,
    upperLimit: airspace.upperLimit || null,
    geometry: airspace.geometry || null,
    source: "openaip",
  };
};

export const mapOpenAipReportingPoint = (
  point: OpenAipRecord | null | undefined,
) => {
  if (!point) return null;
  const { lat, lon } = pointCoordinates(point.geometry);
  return {
    id: point._id || "",
    name: cleanString(point.name),
    country: upperString(point.country),
    lat,
    lon,
    geometry: point.geometry || null,
    compulsory: Boolean(point.compulsory),
    source: "openaip",
  };
};

export const mapOpenAipObstacle = (obstacle: OpenAipRecord | null | undefined) => {
  if (!obstacle) return null;
  const { lat, lon } = pointCoordinates(obstacle.geometry);
  return {
    id: obstacle._id || "",
    name: cleanString(obstacle.name),
    type: String(obstacle.type ?? ""),
    country: upperString(obstacle.country),
    lat,
    lon,
    geometry: obstacle.geometry || null,
    elevationFt: metersToFeet(obstacle.elevation?.value),
    heightFt: metersToFeet(obstacle.height?.value),
    source: "openaip",
  };
};
