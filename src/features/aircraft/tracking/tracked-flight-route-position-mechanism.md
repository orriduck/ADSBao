# Tracked Flight Route + Position Mechanism

The flight page has two independent, server-owned inputs: real-time aircraft
positions and route metadata. The browser subscribes to both over the service
realtime channel and never contacts data providers directly.

## Position lifecycle

- A fresh position updates the focal aircraft and resets the durable tracking
  run's lost-signal counter.
- A run becomes `lost_signal` after repeated absent updates. The map retains
  its last known trace, shows a short notice, and keeps the run resumable.
- A callsign that never resolves to a position exits loading after a bounded
  grace period and shows the unavailable state rather than spinning forever.

## Route lifecycle

Route lookup has one server contract. The realtime scheduler owns its queue,
cache, and backpressure; the client only renders complete origin/destination
pairs. Missing routes remain an explicit unavailable state.

## Trace refresh

The client refreshes a trace after returning to a hidden tab, at a slower
cadence while a signal is lost, and periodically while the flight remains live.
Refreshes merge non-empty points into the existing trace so transient empty
responses cannot erase a visible path.
