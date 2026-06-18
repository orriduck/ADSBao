import { useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { airportDirectoryClient } from "./airportDirectoryClient";

const AIRPORT_DETAIL_STALE_TIME_MS = 5 * 60_000;
const AIRPORT_CONTEXT_STALE_TIME_MS = 5 * 60_000;
const AIRPORT_SURFACE_PAVEMENT_SCOPE = "pavement";
const AIRPORT_SURFACE_STRUCTURES_SCOPE = "structures";

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
  surface: (icao: unknown, scope: unknown = AIRPORT_SURFACE_PAVEMENT_SCOPE) =>
    [
      ...airportProfileQueryKeys.all,
      "surface",
      normalizeAirportProfileIcao(icao),
      normalizeAirportSurfaceScope(scope),
    ] as const,
};

export function normalizeAirportProfileIcao(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(normalized) ? normalized : "";
}

export function normalizeAirportProfileLocale(value: unknown) {
  return String(value || "").trim();
}

export function normalizeAirportSurfaceScope(value: unknown) {
  return String(value || "").trim() === AIRPORT_SURFACE_STRUCTURES_SCOPE
    ? AIRPORT_SURFACE_STRUCTURES_SCOPE
    : AIRPORT_SURFACE_PAVEMENT_SCOPE;
}

export function airportProfileCode(airport: any) {
  return normalizeAirportProfileIcao(
    airport?.icao || airport?.code || airport?.ident,
  );
}

export function mergeAirportProfile({
  detail,
  context,
  surfaceMap,
}: {
  detail: any;
  context?: any;
  surfaceMap?: any;
}) {
  if (!detail) return null;
  return {
    ...detail,
    ...(context || {}),
    surfaceMap: surfaceMap ?? null,
  };
}

const AIRPORT_SURFACE_KIND_RANK: Record<string, number> = {
  building: 0,
  terminal: 1,
  apron: 2,
  taxilane: 3,
  taxiway: 4,
  runway: 5,
};

const airportSurfaceKindRank = (feature: any) =>
  AIRPORT_SURFACE_KIND_RANK[String(feature?.properties?.kind || "")] ?? 6;

export function mergeAirportSurfaceMaps(...surfaceMaps: any[]) {
  const usableMaps = surfaceMaps.filter(Boolean);
  if (!usableMaps.length) return null;

  const features = usableMaps
    .flatMap((surfaceMap) =>
      Array.isArray(surfaceMap?.features?.features)
        ? surfaceMap.features.features
        : [],
    )
    .filter(Boolean);
  if (!features.length) return null;

  const counts: Record<string, number> = {};
  for (const surfaceMap of usableMaps) {
    const sourceCounts = surfaceMap?.counts || {};
    for (const [kind, value] of Object.entries(sourceCounts)) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) continue;
      counts[kind] = (counts[kind] || 0) + numeric;
    }
  }

  const sortedFeatures = [...features].sort((left, right) => {
    const rankDelta = airportSurfaceKindRank(left) - airportSurfaceKindRank(right);
    if (rankDelta !== 0) return rankDelta;
    return String(left?.properties?.id || "").localeCompare(
      String(right?.properties?.id || ""),
    );
  });

  return {
    airport: usableMaps[0]?.airport || "",
    source: usableMaps[0]?.source || "OpenStreetMap",
    sourceAttribution:
      usableMaps.find((surfaceMap) => surfaceMap?.sourceAttribution)
        ?.sourceAttribution || "",
    counts,
    features: {
      type: "FeatureCollection",
      features: sortedFeatures,
    },
  };
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
    queryKey: airportProfileQueryKeys.surface(
      normalizedIcao,
      AIRPORT_SURFACE_PAVEMENT_SCOPE,
    ),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirportSurface(normalizedIcao, {
        scope: AIRPORT_SURFACE_PAVEMENT_SCOPE,
        signal,
      }),
    enabled: canHydrateDeferredPayloads,
    staleTime: AIRPORT_CONTEXT_STALE_TIME_MS,
  });

  const surfaceStructuresQuery = useQuery({
    queryKey: airportProfileQueryKeys.surface(
      normalizedIcao,
      AIRPORT_SURFACE_STRUCTURES_SCOPE,
    ),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirportSurface(normalizedIcao, {
        scope: AIRPORT_SURFACE_STRUCTURES_SCOPE,
        signal,
      }),
    enabled: canHydrateDeferredPayloads && surfacePavementQuery.isSuccess,
    staleTime: AIRPORT_CONTEXT_STALE_TIME_MS,
  });

  const surfaceMap = useMemo(
    () =>
      mergeAirportSurfaceMaps(
        surfacePavementQuery.data,
        surfaceStructuresQuery.data,
      ),
    [surfacePavementQuery.data, surfaceStructuresQuery.data],
  );

  const airport = useMemo(
    () =>
      mergeAirportProfile({
        detail: detailQuery.data,
        context: contextQuery.data,
        surfaceMap,
      }),
    [contextQuery.data, detailQuery.data, surfaceMap],
  );

  return {
    airport:
      airportProfileCode(airport) === normalizedIcao ? airport : null,
    detailQuery,
    contextQuery,
    surfaceQuery: surfacePavementQuery,
    surfaceStructuresQuery,
    queryClient,
  };
}
