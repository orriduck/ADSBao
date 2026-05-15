"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getAircraftIdentity } from "../../features/airport-context/airportContextUiModel.js";
import { useAircraftPreview } from "../../features/aircraft-preview/AircraftPreviewContext.jsx";
import AircraftSlot from "./AircraftSlot.jsx";

export default function AircraftList({
  aircraft = [],
  selectedAircraftId = "",
  onSelectAircraft,
  flipStaggerStep = 0.02,
}) {
  const { clearPreviewedAircraft } = useAircraftPreview();
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
    <ul
      className="aircraft-table-list"
      onMouseLeave={clearPreviewedAircraft}
      onBlur={(event) => {
        // Clear the preview only when focus exits the list entirely, not
        // when it moves between rows inside the list.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          clearPreviewedAircraft();
        }
      }}
    >
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
