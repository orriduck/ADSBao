"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../features/airport-context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

export default function AircraftList({
  aircraft = [],
  altitudeFocus = "all",
  showAirspaceContext = true,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
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
              slotIndex={index}
              altitudeFocus={altitudeFocus}
              showAirspaceContext={showAirspaceContext}
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
  slotIndex = 0,
  altitudeFocus,
  showAirspaceContext,
  selectedAircraftId,
  onSelectAircraft,
}) {
  const currentKey = getAircraftIdentity(aircraft);
  const lastKeyRef = useRef(currentKey);
  const prevAircraftRef = useRef(aircraft);
  const [freezeAircraft, setFreezeAircraft] = useState(null);
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (currentKey === lastKeyRef.current) return;
    const oldAircraft = prevAircraftRef.current;
    lastKeyRef.current = currentKey;

    if (reducedMotion) return;

    // Cascade flips top→bottom so a multi-row reshuffle reads as a wave, not
    // a snap. Cap the delay so deep-scrolled slots don't stall on stale data.
    const flipDelay = Math.min(slotIndex * 0.014, 0.35);

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
  }, [currentKey, controls, reducedMotion, slotIndex]);

  // Track the latest live aircraft so the next tenant swap can freeze on it.
  // Skip while frozen — that's when the displayed row is intentionally stale.
  useEffect(() => {
    if (freezeAircraft === null) prevAircraftRef.current = aircraft;
  });

  const displayed = freezeAircraft ?? aircraft;
  const aircraftId = getAircraftIdentity(displayed);
  const selected = Boolean(aircraftId) && aircraftId === selectedAircraftId;
  const emphasis = resolveAircraftContextEmphasis({
    aircraft: displayed,
    altitudeFocus,
    contextEnabled: showAirspaceContext,
    selected,
  });

  return (
    <motion.div animate={controls} className="aircraft-row-flip-surface">
      <AircraftRow
        aircraft={displayed}
        aircraftId={aircraftId}
        emphasis={emphasis}
        selected={selected}
        onSelectAircraft={onSelectAircraft}
      />
    </motion.div>
  );
}
