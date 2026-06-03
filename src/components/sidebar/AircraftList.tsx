"use client";

import type { CSSProperties } from "react";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import AircraftRow from "./AircraftRow";

export default function AircraftList({
  aircraft = [],
  resetKey,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  return (
    <ul key={resetKey} className="app-list-motion divide-y divide-atc-line">
      {aircraft.map((item, index) => {
        const aircraftId = getAircraftIdentity(item);
        const motionStyle = {
          "--motion-order": Math.min(index, 5),
        } as CSSProperties;
        return (
          <li
            key={aircraftId || index}
            className="relative list-none [perspective:800px]"
            style={motionStyle}
          >
            <AircraftRow
              aircraft={item}
              aircraftId={aircraftId}
              selected={Boolean(aircraftId) && aircraftId === selectedAircraftId}
              onSelectAircraft={onSelectAircraft}
            />
          </li>
        );
      })}
    </ul>
  );
}
