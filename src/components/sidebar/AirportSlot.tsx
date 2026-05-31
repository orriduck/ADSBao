"use client";

import { useEndfieldContentSwap } from "@/components/effects/useEndfieldContentSwap";
import AirportRow from "./AirportRow";

function getAirportIdentity(airport) {
  return airport?.icao || airport?.iata || airport?.id || airport?.name || "";
}

export default function AirportSlot({
  airport,
  cascadeOrder = -1,
  flipStaggerStep = 0.02,
  airportId,
  selected,
  onSelectAirport,
}) {
  const currentKey = getAirportIdentity(airport);
  const flipDelay = Math.max(cascadeOrder, 0) * flipStaggerStep;
  const swap = useEndfieldContentSwap({
    identityKey: currentKey,
    value: airport,
    delaySeconds: flipDelay,
    disabled: selected,
  });
  const displayed = swap.displayedValue;
  const displayedId = displayed?.icao || airportId;

  return (
    <div
      style={swap.style}
      className={`endf-content-swap ${
        swap.replacing ? "endf-content-swap--replacing" : ""
      }`}
    >
      <div
        className={`endf-content-swap__content ${swap.contentPhaseClass}`}
      >
        <AirportRow
          airport={displayed}
          airportId={displayedId}
          selected={selected}
          onSelectAirport={onSelectAirport}
        />
      </div>
    </div>
  );
}
