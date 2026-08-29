import { isIP } from "node:net";

export const THREE_OSM_PROVIDER_ENV_KEYS = [
  "VITE_THREE_OSM_RASTER_SOURCE_ID",
  "VITE_THREE_OSM_RASTER_URL_TEMPLATE",
  "VITE_THREE_OSM_RASTER_ATTRIBUTION",
  "VITE_THREE_OSM_RASTER_ATTRIBUTION_URL",
] as const;

type NetworkAddress = {
  address: string;
  family: string | number;
  internal: boolean;
};

export type LocalDeviceNetworkInterfaces = Record<
  string,
  NetworkAddress[] | undefined
>;

const EXCLUDED_INTERFACE_PREFIXES = [
  "awdl",
  "bridge",
  "docker",
  "llw",
  "utun",
  "vbox",
  "vmnet",
];

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }
  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function normalizeExplicitHost(value: unknown) {
  const host = String(value || "").trim();
  if (!host) return null;
  if (isIP(host) === 4) return isPrivateIpv4(host) ? host : null;
  if (isIP(host) !== 0) return null;
  return /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(host)
    ? host
    : null;
}

export function selectAdsbaoLocalDeviceHost(input: {
  interfaces: LocalDeviceNetworkInterfaces;
  explicitHost?: unknown;
}) {
  const explicitHost = normalizeExplicitHost(input.explicitHost);
  if (explicitHost) return explicitHost;

  return (
    Object.entries(input.interfaces)
      .filter(
        ([name]) =>
          !EXCLUDED_INTERFACE_PREFIXES.some((prefix) => name.startsWith(prefix)),
      )
      .flatMap(([name, addresses]) =>
        (addresses || [])
          .filter(
            (address) =>
              !address.internal &&
              (address.family === "IPv4" || address.family === 4) &&
              isPrivateIpv4(address.address),
          )
          .map((address) => ({
            address: address.address,
            score: name === "en0" ? 100 : name === "en1" ? 90 : 10,
          })),
      )
      .sort(
        (left, right) =>
          right.score - left.score || left.address.localeCompare(right.address),
      )[0]?.address || null
  );
}

export function resolveThreeOsmProviderFieldState(
  env: Record<string, string | undefined>,
) {
  const configuredFields = THREE_OSM_PROVIDER_ENV_KEYS.filter((key) =>
    Boolean(env[key]?.trim()),
  );
  return {
    configured: configuredFields.length,
    total: THREE_OSM_PROVIDER_ENV_KEYS.length,
    complete: configuredFields.length === THREE_OSM_PROVIDER_ENV_KEYS.length,
    partial:
      configuredFields.length > 0 &&
      configuredFields.length < THREE_OSM_PROVIDER_ENV_KEYS.length,
  };
}

export function buildThreeOsmDeviceAcceptanceUrl(input: {
  origin: string;
  airport?: string;
  configuredTiles?: boolean;
}) {
  const airport = String(input.airport || "KBOS")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "") || "KBOS";
  const url = new URL(`/airport/${airport}`, input.origin);
  url.searchParams.set("threeOsmPoc", "1");
  url.searchParams.set("threeOsmDebug", "1");
  url.searchParams.set("threeOsmSoak", "1");
  url.searchParams.set("threeOsmAcceptance", "1");
  url.searchParams.set("threeOsmStress", "250");
  if (input.configuredTiles) url.searchParams.set("threeOsmTiles", "configured");
  url.searchParams.set("locale", "en");
  return url.toString();
}
