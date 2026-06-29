import FlightExplorer from "@/components/flight/explorer/FlightExplorer";

// Entry point for the per-aircraft tracking page. Shares the airport
// detail layout (left sidebar + full-height map) but the sidebar shows
// the focal aircraft's metadata and the map centers on / tracks that
// aircraft as it moves.
export default function FlightScreen({ callsign = "", icaoHint = "" }) {
  return <FlightExplorer callsign={callsign} icaoHint={icaoHint} />;
}
