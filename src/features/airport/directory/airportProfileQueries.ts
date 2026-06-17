import { useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { airportDirectoryClient } from "./airportDirectoryClient";

const AIRPORT_DETAIL_STALE_TIME_MS = 5 * 60_000;
const AIRPORT_CONTEXT_STALE_TIME_MS = 5 * 60_000;

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
    surfaceMap: surfaceMap ?? detail.surfaceMap ?? null,
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

  const surfaceQuery = useQuery({
    queryKey: airportProfileQueryKeys.surface(normalizedIcao),
    queryFn: ({ signal }) =>
      airportDirectoryClient.resolveAirportSurface(normalizedIcao, { signal }),
    enabled: canHydrateDeferredPayloads,
    staleTime: AIRPORT_CONTEXT_STALE_TIME_MS,
  });

  const airport = useMemo(
    () =>
      mergeAirportProfile({
        detail: detailQuery.data,
        context: contextQuery.data,
        surfaceMap: surfaceQuery.data,
      }),
    [contextQuery.data, detailQuery.data, surfaceQuery.data],
  );

  return {
    airport:
      airportProfileCode(airport) === normalizedIcao ? airport : null,
    detailQuery,
    contextQuery,
    surfaceQuery,
    queryClient,
  };
}
