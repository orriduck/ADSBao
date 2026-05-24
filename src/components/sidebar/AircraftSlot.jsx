"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
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
  const selectedAircraftIdRef = useRef(selectedAircraftId);
  selectedAircraftIdRef.current = selectedAircraftId;
  const [freezeAircraft, setFreezeAircraft] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceDelay, setReplaceDelay] = useState(0);
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (currentKey === lastKeyRef.current) return;
    const oldKey = lastKeyRef.current;
    const oldAircraft = prevAircraftRef.current;
    lastKeyRef.current = currentKey;

    if (reducedMotion) return;

    // Skip the flip animation when the swap is caused by a selection
    // change. Two cases:
    //   1. List slot's old aircraft just became selected and moved to
    //      the pin slot (oldKey === selectedAircraftId). Animating the
    //      frozen old aircraft would fade an ink+yellow row, which in
    //      light theme looks like ink washing to white.
    //   2. Pin slot's incoming aircraft is the just-clicked one
    //      (currentKey === selectedAircraftId). The frozen previous
    //      aircraft would briefly render as non-selected (light+ink),
    //      flashing the pin from ink to light before the swap. Snap
    //      instead so the pin transitions cleanly from one focused
    //      aircraft to the next.
    const selectedId = selectedAircraftIdRef.current;
    if (oldKey === selectedId || currentKey === selectedId) {
      setFreezeAircraft(null);
      setReplacing(false);
      controls.set({ clipPath: "inset(0 0% 0 0)" });
      return;
    }

    const flipDelay =
      Math.max(cascadeOrderRef.current, 0) * flipStaggerStepRef.current;

    setFreezeAircraft(oldAircraft);
    setReplaceDelay(flipDelay);
    setReplacing(true);
    let cancelled = false;
    (async () => {
      // Erase old tenant, swap data while hidden, then scan the new
      // tenant in from the left. No opacity blending on light surfaces.
      await controls.start({
        clipPath: "inset(0 0 0 100%)",
        transition: { duration: 0.14, ease: [1, 0, 0.7, 1], delay: flipDelay },
      });
      if (cancelled) return;
      setFreezeAircraft(null);
      await controls.set({ clipPath: "inset(0 100% 0 0)" });
      await controls.start({
        clipPath: "inset(0 0% 0 0)",
        transition: { duration: 0.22, ease: [1, 0, 0.7, 1], delay: 0.1 },
      });
      if (!cancelled) setReplacing(false);
    })();
    return () => {
      cancelled = true;
      setReplacing(false);
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
    <div
      style={{ "--aircraft-row-replace-delay": `${replaceDelay}s` }}
      className={`aircraft-row-flip-surface ${
        replacing ? "aircraft-row-flip-surface--replacing" : ""
      }`}
    >
      <motion.div
        animate={controls}
        className="aircraft-row-flip-surface__content"
      >
        <AircraftRow
          aircraft={displayed}
          aircraftId={aircraftId}
          selected={selected}
          onSelectAircraft={onSelectAircraft}
        />
      </motion.div>
    </div>
  );
}
