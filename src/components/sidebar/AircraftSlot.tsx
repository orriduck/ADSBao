import { useEffect, useRef } from "react";
import { useContentSwap } from "@/components/effects/useContentSwap";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import AircraftRow from "./AircraftRow";

// Single row "slot" that performs a soft erase/reveal for the
// pinned selected-aircraft card. The scroll list renders rows directly so it
// never leaves empty animated slots behind during live re-sorts.
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
  const swap = useContentSwap({
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
      className={`content-swap ${
        swap.replacing ? "content-swap--replacing" : ""
      }`}
    >
      <div
        className={`content-swap__content ${swap.contentPhaseClass}`}
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
