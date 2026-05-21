"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel.js";
import AircraftSlot from "./AircraftSlot.jsx";

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
      {/* initial={true} so the first render cascades visibly when the
          list first appears (page load / filter change). After mount,
          AnimatePresence only animates the diff (new arrivals exit
          animations etc.). */}
      <AnimatePresence initial={true}>
        {aircraft.map((item, index) => {
          // Cascade reveal — each item delays 70ms × its index so the
          // list fades in top-down. Capped at 18 items so a long
          // backlog finishes settling in ~1.25 s.
          const cascadeDelay = Math.min(index, 18) * 0.07;
          return (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
              transition={{
                duration: 0.18,
                ease: [0.2, 0.6, 0.2, 1],
                delay: cascadeDelay,
              }}
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
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
