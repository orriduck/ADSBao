"use client";

import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import AircraftRow from "./AircraftRow";
import CardFlipSlot from "./CardFlipSlot";

export default function AircraftList({
  aircraft = [],
  resetKey,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  return (
    <ul key={resetKey} className="app-list-motion divide-y divide-atc-line">
      {aircraft.map((item, index) => {
        // Position-keyed slot: when the list re-sorts, this slot's occupant
        // changes and its content card-flips in place (CardFlipSlot) instead
        // of the row sliding to a new row.
        return (
          <li key={index} className="relative list-none">
            <CardFlipSlot
              swapKey={getAircraftIdentity(item) || `aircraft:${index}`}
              value={item}
            >
              {(displayed) => {
                const aircraftId = getAircraftIdentity(displayed);
                return (
                  <AircraftRow
                    aircraft={displayed}
                    aircraftId={aircraftId}
                    selected={
                      Boolean(aircraftId) && aircraftId === selectedAircraftId
                    }
                    onSelectAircraft={onSelectAircraft}
                  />
                );
              }}
            </CardFlipSlot>
          </li>
        );
      })}
    </ul>
  );
}
