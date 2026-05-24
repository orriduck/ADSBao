"use client";

import { useEffect, useRef } from "react";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel.js";
import AircraftSlot from "./AircraftSlot.jsx";

export default function AircraftList({
  aircraft = [],
  selectedAircraftId = "",
  onSelectAircraft,
  flipStaggerStep = 0.02,
}) {
  // Assign each slot whose tenant changed since last render a cascade ordinal
  // (0, 1, 2, ...) in slot order; unchanged slots get -1. Each replacing slot
  // delays its erase/reveal by ordinal × flipStaggerStep, so consecutive swaps
  // fire that step apart top→bottom — unchanged slots in between don't add to the gap.
  const prevKeysRef = useRef([]);
  const currentKeys = aircraft.map(getAircraftIdentity);
  const prevKeys = prevKeysRef.current;
  let cascadeCursor = 0;
  const cascadeOrders = currentKeys.map((cur, i) => {
    const prev = prevKeys[i];
    return prev !== undefined && prev !== cur ? cascadeCursor++ : -1;
  });
  useEffect(() => {
    prevKeysRef.current = currentKeys;
  });

  return (
    <ul className="aircraft-table-list">
      {aircraft.map((item, index) => (
        <li key={index} className="aircraft-table-list__item">
          <AircraftSlot
            aircraft={item}
            cascadeOrder={cascadeOrders[index]}
            flipStaggerStep={flipStaggerStep}
            selectedAircraftId={selectedAircraftId}
            onSelectAircraft={onSelectAircraft}
          />
        </li>
      ))}
    </ul>
  );
}
