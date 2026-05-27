"use client";

import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

export default function AircraftList({
  aircraft = [],
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  return (
    <ul className="aircraft-table-list">
      {aircraft.map((item, index) => {
        const aircraftId = getAircraftIdentity(item);
        return (
          <li
            key={aircraftId || index}
            className="aircraft-table-list__item"
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
