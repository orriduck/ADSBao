"use client";

import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import AircraftRow from "./AircraftRow";

export default function AircraftList({
  aircraft = [],
  resetKey,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  return (
    <ul className="divide-y divide-atc-line">
      {aircraft.map((item, index) => {
        const aircraftId = getAircraftIdentity(item);
        return (
          <li
            key={aircraftId || index}
            className="relative list-none [perspective:800px]"
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
