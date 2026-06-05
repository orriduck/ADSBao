import { ROUTE_PROVIDER } from "../sourceDisplayModel";
import { buildGreatCirclePath } from "./greatCircleRouteModel";

type FlightRouteArcOptions = {
  route?: Record<string, any> | null;
  routeProvider?: unknown;
  routeEndpointAirportsOnly?: unknown;
};

type FlightRouteArcPathOptions = FlightRouteArcOptions & {
  from?: Record<string, any> | null;
  segments?: unknown;
};

function hasDestination(route: Record<string, any> | null | undefined) {
  return Boolean(route?.destination);
}

export function shouldShowFlightAwareRouteArc({
  route = null,
  routeProvider = "",
  routeEndpointAirportsOnly = false,
}: FlightRouteArcOptions = {}) {
  if (!hasDestination(route)) return false;

  const normalizedProvider = String(routeProvider || "").trim().toLowerCase();
  return (
    normalizedProvider === ROUTE_PROVIDER.FLIGHTAWARE ||
    Boolean(routeEndpointAirportsOnly)
  );
}

export function buildFlightAwareRouteArcPath({
  route = null,
  routeProvider = "",
  routeEndpointAirportsOnly = false,
  from = null,
  segments = 32,
}: FlightRouteArcPathOptions = {}) {
  if (
    !shouldShowFlightAwareRouteArc({
      route,
      routeProvider,
      routeEndpointAirportsOnly,
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

export function resolveFocusedFlightAwareRouteArcPath({
  selectedAircraft = null,
  focalAircraft = null,
  routeProvider = "",
  routeEndpointAirportsOnly = false,
  from = null,
  segments = 32,
}: {
  selectedAircraft?: Record<string, any> | null;
  focalAircraft?: Record<string, any> | null;
  routeProvider?: unknown;
  routeEndpointAirportsOnly?: unknown;
  from?: Record<string, any> | null;
  segments?: unknown;
} = {}) {
  const route = focalAircraft?.flightRoute || selectedAircraft?.flightRoute || null;
  return buildFlightAwareRouteArcPath({
    route,
    routeProvider,
    routeEndpointAirportsOnly,
    from,
    segments,
  });
}
