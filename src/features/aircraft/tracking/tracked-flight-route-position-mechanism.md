# Tracked Flight Route + Position Mechanism

The flight page has two independent, server-owned inputs: nearby flight context
and route metadata. The browser keeps one SSE stream for `nearby:<CALLSIGN>`;
its named `nearby:snapshot`, `nearby:traffic`, and `nearby:status` events carry
the focal aircraft, nearby traffic, and nearby airport list. The browser never
contacts data providers directly.

## Position lifecycle

- A fresh SSE snapshot updates the focal aircraft and its nearby context, then
  resets the durable tracking run's lost-signal counter.
- A run becomes `lost_signal` after repeated absent updates. The map retains
  its last known trace, shows a short notice, and keeps the run resumable.
- A callsign that never resolves to a position exits loading after a bounded
  grace period and shows the unavailable state rather than spinning forever.

## Route lifecycle

Route lookup is a one-shot callsign HTTP read. The service may serve a
30-minute cache but never runs a background retry for the browser. The client
honours `Retry-After` when present and otherwise retries temporary failures
with jittered exponential backoff; navigation, unmount, or callsign changes
abort that retry. Permanent failures become an explicit unavailable state.

## Inspectability

Chrome DevTools shows each same-origin `/events/nearby/...` request directly.
Every frame has a descriptive SSE event name plus a channel, sequence, timing,
freshness and neutral retry status. One logical key shares one EventSource per
tab and remains warm briefly across SPA handoffs.

## Trace refresh

The client refreshes a trace after returning to a hidden tab, at a slower
cadence while a signal is lost, and periodically while the flight remains live.
Refreshes merge non-empty points into the existing trace so transient empty
responses cannot erase a visible path.
