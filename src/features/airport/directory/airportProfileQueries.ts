import { useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { airportDirectoryClient } from "./airportDirectoryClient";

const AIRPORT_DETAIL_STALE_TIME_MS = 5 * 60_000;
const AIRPORT_CONTEXT_STALE_TIME_MS = 5 * 60_000;
const AIRPORT_PROFILE_SEED_MAX_DRIFT_DEGREES = 0.02;

export const airportProfileQueryKeys = {
  all: ["airport-profile"] as const,
  detail: (icao: unknown, locale: unknown = "") =>
    [
      ...airportProfileQueryKeys.all,
      "detail",
      normalizeAirportProfileIcao(icao),
      normalizeAirportProfileLocale(locale),
    ] as const,
  context: (icao: unknown) =>
    [
      ...airportProfileQueryKeys.all,
      "context",
      normalizeAirportProfileIcao(icao),
    ] as const,
  surface: (icao: unknown) =>
    [
      ...airportProfileQueryKeys.all,
      "surface",
      normalizeAirportProfileIcao(icao),
    ] as const,
};

export function normalizeAirportProfileIcao(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(normalized) ? normalized : "";
}

export function normalizeAirportProfileLocale(value: unknown) {
  return String(value || "").trim();
}

export function airportProfileCode(airport: any) {
  return normalizeAirportProfileIcao(
    airport?.icao || airport?.code || airport?.ident,
  );
}

export function resolveAirportProfileSeed({
  icao,
  navigationAirport = null,
  localAirport = null,
}: {
  icao: unknown;
  navigationAirport?: any;
  localAirport?: any;
}) {
  const normalizedIcao = normalizeAirportProfileIcao(icao);
  if (airportProfileCode(navigationAirport) === normalizedIcao) {
    return navigationAirport;
  }
  if (airportProfileCode(localAirport) === normalizedIcao) {
    return localAirport;
  }
  return null;
}

export function resolveAirportProfileCoordinates({
  detail,
  seedAirport = null,
}: {
  detail: any;
  seedAirport?: any;
}) {
  const detailCoordinates = readAirportProfileCoordinates(detail);
  const detailCode = airportProfileCode(detail);
  if (!detailCode || airportProfileCode(seedAirport) !== detailCode) {
    return detailCoordinates;
  }
  const seedCoordinates = readAirportProfileCoordinates(seedAirport);
  if (seedCoordinates.lat == null || seedCoordinates.lon == null) {
    return detailCoordinates;
  }
  if (detailCoordinates.lat == null || detailCoordinates.lon == null) {
    return seedCoordinates;
  }
  const smallCoordinateDrift =
    Math.abs(seedCoordinates.lat - detailCoordinates.lat) <=
      AIRPORT_PROFILE_SEED_MAX_DRIFT_DEGREES &&
    Math.abs(seedCoordinates.lon - detailCoordinates.lon) <=
      AIRPORT_PROFILE_SEED_MAX_DRIFT_DEGREES;
  return smallCoordinateDrift ? seedCoordinates : detailCoordinates;
}

export function mergeAirportProfile({
  detail,
  context,
  surfaceMap,
  seedAirport = null,
}: {
  detail: any;
  context?: any;
  surfaceMap?: any;
  seedAirport?: any;
}) {
  if (!detail) return null;
  const merged = {
    ...detail,
    ...(context || {}),
  };
  return {
    ...merged,
    ...resolveAirportProfileCoordinates({ detail: merged, seedAirport }),
    surfaceMap: surfaceMap ?? null,
  };
}

function readAirportProfileCoordinates(airport: any) {
  return {
    lat: normalizeAirportProfileCoordinate(airport?.lat, -90, 90),
    lon: normalizeAirportProfileCoordinate(airport?.lon, -180, 180),
  };
}

function normalizeAirportProfileCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (value == null || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function isSeedForIcao(seedAirport: any, icao: string) {
  return Boolean(seedAirport && airportProfileCode(seedAirport) === icao);
}

export function prefetchAirportProfile(
  queryClient: QueryClient,
  {
    icao,
    locale,
  }: {
    icao: unknown;
    locale: unknown;
  },
) {
  const normalizedIcao = normalizeAirportProfileIcao(icao);
  if (!normalizedIcao) return;
  const normalizedLocale = normalizeAirportProfileLocale(locale);

  void queryClient.prefetchQuery({
    queryKey: airportProfileQueryKeys.detail(normalizedIcao, normalizedLocale),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirport(normalizedIcao, {
        locale: normalizedLocale,
        signal,
      }),
    staleTime: AIRPORT_DETAIL_STALE_TIME_MS,
  });
}

export function useAirportProfileQueries({
  icao,
  locale,
  seedAirport = null,
}: {
  icao: unknown;
  locale: unknown;
  seedAirport?: any;
}) {
  const queryClient = useQueryClient();
  const normalizedIcao = normalizeAirportProfileIcao(icao);
  const normalizedLocale = normalizeAirportProfileLocale(locale);
  const enabled = Boolean(normalizedIcao);

  const detailQuery = useQuery({
    queryKey: airportProfileQueryKeys.detail(normalizedIcao, normalizedLocale),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirport(normalizedIcao, {
        locale: normalizedLocale,
        signal,
      }),
    enabled,
    staleTime: AIRPORT_DETAIL_STALE_TIME_MS,
    placeholderData: () =>
      isSeedForIcao(seedAirport, normalizedIcao) ? seedAirport : undefined,
  });

  const canHydrateDeferredPayloads = enabled && Boolean(detailQuery.data);

  const contextQuery = useQuery({
    queryKey: airportProfileQueryKeys.context(normalizedIcao),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirportContext(normalizedIcao, { signal }),
    enabled: canHydrateDeferredPayloads,
    staleTime: AIRPORT_CONTEXT_STALE_TIME_MS,
  });

  const surfacePavementQuery = useQuery({
    queryKey: airportProfileQueryKeys.surface(normalizedIcao),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirportSurface(normalizedIcao, { signal }),
    enabled: canHydrateDeferredPayloads,
    staleTime: AIRPORT_CONTEXT_STALE_TIME_MS,
  });

  const surfaceMap = surfacePavementQuery.data || null;

  const airport = useMemo(
    () =>
      mergeAirportProfile({
        detail: detailQuery.data,
        context: contextQuery.data,
        surfaceMap,
        seedAirport,
      }),
    [contextQuery.data, detailQuery.data, seedAirport, surfaceMap],
  );

  return {
    airport:
      airportProfileCode(airport) === normalizedIcao ? airport : null,
    detailQuery,
    contextQuery,
    surfaceQuery: surfacePavementQuery,
    queryClient,
  };
}
