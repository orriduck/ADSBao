"use client";

import { useEffect, useRef } from "react";
import { useEndfieldContentSwap } from "@/components/effects/useEndfieldContentSwap.js";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

// Single row "slot" that performs an Endfield-style erase/reveal when its
// tenant aircraft changes. Used both inside AircraftList (one per scrollable
// row, cascaded by cascadeOrder × flipStaggerStep) and inside the sidebar
// header to drive the pinned selected-aircraft card (single slot,
// cascadeOrder 0 so the swap fires immediately).
export default function AircraftSlot({
  aircraft,
  cascadeOrder = -1,
  flipStaggerStep = 0.02,
  disableSwap = false,
  selectedAircraftId,
  onSelectAircraft,
}) {
  const currentKey = getAircraftIdentity(aircraft);
  const previousKeyRef = useRef(currentKey);
  const cascadeOrderRef = useRef(cascadeOrder);
  cascadeOrderRef.current = cascadeOrder;
  const flipStaggerStepRef = useRef(flipStaggerStep);
  flipStaggerStepRef.current = flipStaggerStep;

  const selectedId = selectedAircraftId || "";
  const previousKey = previousKeyRef.current;
  const flipDelay =
    Math.max(cascadeOrderRef.current, 0) * flipStaggerStepRef.current;
  const swap = useEndfieldContentSwap({
    identityKey: currentKey,
    value: aircraft,
    delaySeconds: flipDelay,
    disabled:
      disableSwap || currentKey === selectedId || previousKey === selectedId,
  });
  useEffect(() => {
    previousKeyRef.current = currentKey;
  }, [currentKey]);
  const displayed = swap.displayedValue;
  const aircraftId = getAircraftIdentity(displayed);
  const selected = Boolean(aircraftId) && aircraftId === selectedAircraftId;

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
        <AircraftRow
          aircraft={displayed}
          aircraftId={aircraftId}
          selected={selected}
          onSelectAircraft={onSelectAircraft}
        />
      </div>
    </div>
  );
}
