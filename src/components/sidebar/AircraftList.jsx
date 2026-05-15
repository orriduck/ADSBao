"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import { getAircraftIdentity } from "../../features/airport-context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

export default function AircraftList({
  aircraft = [],
  selectedAircraftId = "",
  onSelectAircraft,
  flipStaggerStep = 0.02,
}) {
  // Assign each slot whose tenant changed since last render a cascade ordinal
  // (0, 1, 2, ...) in slot order; unchanged slots get -1. Each flipping slot
  // delays its rotate by ordinal × flipStaggerStep, so consecutive flips fire
  // that step apart top→bottom — unchanged slots in between don't add to the gap.
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
      <AnimatePresence initial={false}>
        {aircraft.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, scaleY: 0.94 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.94, transition: { duration: 0.2 } }}
            transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="aircraft-table-list__item"
          >
            <AircraftSlot
              aircraft={item}
              cascadeOrder={cascadeOrders[index]}
              flipStaggerStep={flipStaggerStep}
              selectedAircraftId={selectedAircraftId}
              onSelectAircraft={onSelectAircraft}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function AircraftSlot({
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
