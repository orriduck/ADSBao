"use client";

// Callsign + parsed route. Mirrors the sidebar row's identity cell so the
// hover state feels like a richer continuation rather than new data.
export default function AircraftPreviewIdentity({ aircraft }) {
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const route = aircraft?.flightRouteLabel || "";

  return (
    <div className="aircraft-preview-identity">
      <span className="aircraft-preview-identity__callsign">{callsign}</span>
      {route ? (
        <span className="aircraft-preview-identity__route">{route}</span>
      ) : (
        <span className="aircraft-preview-identity__route aircraft-preview-identity__route--empty">
          No route
        </span>
      )}
    </div>
  );
}
