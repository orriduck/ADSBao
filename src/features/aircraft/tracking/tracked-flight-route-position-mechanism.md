# Tracked Flight Route + Position Mechanism

This mechanism keeps the flight page from treating every callsign poll result
as the same kind of signal. The callsign endpoint resolves one explicit
`trackingState`, and the React hook, lost-signal model, and route scheduler all
consume that state.

## Position States

`resolveTrackedFlightPosition()` returns:

- `adsb_live`: a fresh ADS-B position from adsb.lol or airplanes.live. This is
  the primary position and resets lost-signal misses.
- `flightaware_active`: ADS-B is absent or stale, but the FlightAware-enabled
  path has an active flight. If FlightAware has a public position, the page uses
  it and labels it as FlightAware estimated / predicted / observed.
- `flightaware_terminal`: FlightAware says the flight has arrived, landed,
  diverted, cancelled, or is otherwise terminal. Terminal FlightAware points are
  not treated as active aircraft positions; the page keeps the last ADS-B /
  last-known point and shows lost signal.
- `stale`: only an old ADS-B point remains. The map can keep that point visible,
  but the state still increments lost-signal misses.
- `missing`: neither ADS-B nor FlightAware has an active position. The hook does
  not clear the old aircraft snapshot; it lets the existing lost-signal flow
  decide when to warn.

Without the FlightAware flag, the resolver never calls FlightAware. Stale ADS-B
and missing states still increment lost-signal misses instead of pretending a
stale `ac[0]` is a fresh signal.

## Route Fetch Rules

The route scheduler still owns queueing and cache state. `useFlightRoutes()`
remains a thin React wrapper.

- `adsb_live` and `flightaware_active` aircraft can enter the route queue.
- `flightaware_terminal`, `stale`, and `missing` aircraft do not start new route
  fetches.
- Route metadata already attached to an aircraft (`origin` + `destination`) can
  still render as an `aircraft-metadata` route even when route fetches are
  suppressed.
- FlightAware route requests continue to use a provider-scoped cache key and
  `provider=flightaware`, so adsbdb cache entries cannot mask FlightAware
  results.

## Tab Visibility

The flight page keeps polling while hidden. On visibility return, it performs an
immediate position refresh and then lets the route scheduler react to the new
aircraft input. Because terminal / stale / missing states are filtered before
queueing, returning to an old tab does not create repeated route lookups for a
flight that has already arrived or lost all live position sources.

## Map Treatment

FlightAware route arcs are predicted context, not observed ADS-B trace. Both the
foreground route and the glow layer use the same dashed pattern so production
rendering does not visually collapse into a solid line.
