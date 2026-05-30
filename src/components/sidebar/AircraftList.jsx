"use client";

import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

export default function AircraftList({
  aircraft = [],
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
