# FlightAware Tracked-Flight Fallback Research

Date: 2026-05-25

## Pages checked

- `https://www.flightaware.com/live/flight/AAL100`
- `https://www.flightaware.com/live/fleet/AAL`
- `https://www.flightaware.com/live/flight/BAW212`
- `https://www.flightaware.com/live/flight/id/AAL100-1779437782-airline-1193p%3a0`

## Extraction strategy

Use the public `/live/flight/{CALLSIGN}` page as a callsign-scoped source and parse only the embedded `trackpollBootstrap` script state. Do not use browser automation. Do not call FlightAware fleet, airport, map-bounds, or global endpoints from ADSBao runtime.

The page also loads a `TrackPollClient.js` script that polls `/ajax/trackpoll.rvt` every 60 seconds with a page token. That endpoint is more dynamic but token-bound and less stable than the initial embedded state, so the first pass uses the server-rendered HTML only.

## Observed behavior

- `/live/flight/{CALLSIGN}` is enough to render a current or recent flight page for callsigns such as `AAL100` and `BAW212`.
- `/live/flight/id/...` redirects to a canonical history instance such as `/live/flight/AAL100/history/20260524/2220Z/KJFK/EGLL`.
- The same callsign can have several entries in `activityLog.flights` for upcoming, current, and past instances. The active candidate should prefer a usable position, started-but-not-ended status, and the freshest timestamp.
- FlightAware exposes origin, destination, aircraft type, filed route, filed speed, filed altitude, status, and track/map payloads in embedded JSON.
- Latitude/longitude is available either as top-level `coord: [lon, lat]` or as track points shaped like `{ timestamp, coord: [lon, lat], alt, gs, type }`.
- Track point `type` can carry labels such as `TP`; page/update labels can also say estimated. These are preserved as `observed`, `estimated`, `predicted`, or `interpolated` when detectable.
- Some pages return metadata but no public position (`coord: null`, `track: null`), especially scheduled/upcoming instances. The provider returns metadata only in that case.
- The page response and TrackPoll client both suggest roughly 60-second freshness: response `Cache-Control: max-age=60`, `trackpollGlobals.INTERVAL: 60`.

## Risks and fallback behavior

- The parser depends on FlightAware page internals and can break if `trackpollBootstrap` changes shape or disappears.
- The HTML includes a Terms-of-Use warning recommending commercial APIs for data robots; keep this private, feature-flagged, low-volume, and callsign-only.
- FlightAware map tracks can include predicted points after the last observed point. ADSBao must not silently present these as ADS-B observations.
- If parsing fails, network fails, times out, or FlightAware has metadata without lat/lon, ADSBao keeps existing stale/last-known tracked-flight behavior.
