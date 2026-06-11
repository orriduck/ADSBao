"use client";

import { useContentSwap } from "@/components/effects/useContentSwap";
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
  const swap = useContentSwap({
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
      className={`content-swap ${
        swap.replacing ? "content-swap--replacing" : ""
      }`}
    >
      <div
        className={`content-swap__content ${swap.contentPhaseClass}`}
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
