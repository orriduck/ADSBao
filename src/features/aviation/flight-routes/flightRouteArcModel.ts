import { buildGreatCirclePath } from "./greatCircleRouteModel";

type FlightRouteArcOptions = {
  route?: Record<string, any> | null;
};

type FlightRouteArcPathOptions = FlightRouteArcOptions & {
  from?: Record<string, any> | null;
  segments?: unknown;
};

function hasDestination(route: Record<string, any> | null | undefined) {
  return Boolean(route?.destination);
}

export function shouldShowFlightRouteArc({ route = null }: FlightRouteArcOptions = {}) {
  return hasDestination(route);
}

export function buildFlightRouteArcPath({
  route = null,
  from = null,
  segments = 32,
}: FlightRouteArcPathOptions = {}) {
  if (
    !shouldShowFlightRouteArc({
      route,
    })
  ) {
    return [];
  }

  return buildGreatCirclePath({
    from,
    to: route?.destination,
    segments,
  });
}

export function resolveFocusedFlightRouteArcPath({
  selectedAircraft = null,
  focalAircraft = null,
  from = null,
  segments = 32,
}: {
  selectedAircraft?: Record<string, any> | null;
  focalAircraft?: Record<string, any> | null;
  from?: Record<string, any> | null;
  segments?: unknown;
} = {}) {
  const route = focalAircraft?.flightRoute || selectedAircraft?.flightRoute || null;
  return buildFlightRouteArcPath({
    route,
    from,
    segments,
  });
}
