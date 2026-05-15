"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import { getAircraftIdentity } from "../../features/airport-context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

// Single row "slot" that flips (rotateX -90°) when its tenant aircraft
// changes. Used both inside AircraftList (one per scrollable row, cascaded
// by cascadeOrder × flipStaggerStep) and inside the sidebar header to drive
// the pinned selected-aircraft card (single slot, cascadeOrder 0 so the
// flip fires immediately).
export default function AircraftSlot({
  aircraft,
  cascadeOrder = -1,
  flipStaggerStep = 0.02,
  selectedAircraftId,
  onSelectAircraft,
}) {
  const currentKey = getAircraftIdentity(aircraft);
  const lastKeyRef = useRef(currentKey);
  const prevAircraftRef = useRef(aircraft);
  const cascadeOrderRef = useRef(cascadeOrder);
  cascadeOrderRef.current = cascadeOrder;
  const flipStaggerStepRef = useRef(flipStaggerStep);
  flipStaggerStepRef.current = flipStaggerStep;
  const [freezeAircraft, setFreezeAircraft] = useState(null);
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (currentKey === lastKeyRef.current) return;
    const oldAircraft = prevAircraftRef.current;
    lastKeyRef.current = currentKey;

    if (reducedMotion) return;

    const flipDelay =
      Math.max(cascadeOrderRef.current, 0) * flipStaggerStepRef.current;

    setFreezeAircraft(oldAircraft);
    let cancelled = false;
    (async () => {
      await controls.start({
        rotateX: -90,
        opacity: 0,
        filter: "brightness(1.18)",
        transition: { duration: 0.18, ease: "easeIn", delay: flipDelay },
      });
      if (cancelled) return;
      setFreezeAircraft(null);
      await controls.start({
        rotateX: 0,
        opacity: 1,
        filter: "brightness(1)",
        transition: { duration: 0.22, ease: "easeOut" },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [currentKey, controls, reducedMotion]);

  // Track the latest live aircraft so the next tenant swap can freeze on it.
  // Skip while frozen — that's when the displayed row is intentionally stale.
  useEffect(() => {
    if (freezeAircraft === null) prevAircraftRef.current = aircraft;
  });

  const displayed = freezeAircraft ?? aircraft;
  const aircraftId = getAircraftIdentity(displayed);
  const selected = Boolean(aircraftId) && aircraftId === selectedAircraftId;

  return (
    <motion.div animate={controls} className="aircraft-row-flip-surface">
      <AircraftRow
        aircraft={displayed}
        aircraftId={aircraftId}
        selected={selected}
        onSelectAircraft={onSelectAircraft}
      />
    </motion.div>
  );
}
