"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../features/airport-context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

function getAircraftRowKey(aircraft = {}) {
  const identity = getAircraftIdentity(aircraft);
  return identity || aircraft.callsign || "anon";
}

export default function AircraftList({
  aircraft = [],
  altitudeFocus = "all",
  showAirspaceContext = true,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  const listRef = useRef(null);
  const scrollAnchor = useRef(null);
  const prevAircraftRef = useRef([]);

  // Detect which rows moved by comparing current order to previous render's order.
  // prevAircraftRef.current still holds the previous snapshot during render (effect hasn't run yet).
  const movedKeys = useMemo(() => {
    const prevMap = new Map(
      prevAircraftRef.current.map((item, i) => [getAircraftRowKey(item), i]),
    );
    const moved = new Set();
    aircraft.forEach((item, i) => {
      const key = getAircraftRowKey(item);
      const prevIdx = prevMap.get(key);
      if (prevIdx !== undefined && prevIdx !== i) moved.add(key);
    });
    return moved;
  }, [aircraft]);

  // Save current order as previous for next render's comparison.
  useEffect(() => {
    prevAircraftRef.current = aircraft;
  }, [aircraft]);

  // Track topmost visible row for scroll anchor restore.
  useLayoutEffect(() => {
    const scroller = listRef.current?.parentElement;
    if (!scroller) return undefined;

    const remember = () => {
      scrollAnchor.current = getScrollAnchor(scroller);
    };

    remember();
    scroller.addEventListener("scroll", remember, { passive: true });
    return () => scroller.removeEventListener("scroll", remember);
  }, []);

  // Restore scroll position after reorder so the viewport doesn't jump.
  useLayoutEffect(() => {
    const scroller = listRef.current?.parentElement;
    if (!scroller || !scrollAnchor.current) return;
    restoreScrollAnchor(scroller, scrollAnchor.current);
  }, [aircraft]);

  return (
    <LayoutGroup>
      <motion.ul ref={listRef} className="aircraft-table-list">
        <AnimatePresence initial={false} mode="popLayout">
          {aircraft.map((item, index) => {
            const rowKey = getAircraftRowKey(item);
            const aircraftId = getAircraftIdentity(item);
            const selected = aircraftId && aircraftId === selectedAircraftId;
            const emphasis = resolveAircraftContextEmphasis({
              aircraft: item,
              altitudeFocus,
              contextEnabled: showAirspaceContext,
              selected,
            });
            const moved = movedKeys.has(rowKey);

            return (
              <motion.li
                key={rowKey}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{
                  layout: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
                  opacity: { duration: 0.22 },
                }}
                className="aircraft-table-list__item"
                data-aircraft-row-key={rowKey}
              >
                <RowFlipSurface moved={moved} moveToken={`${rowKey}:${index}`}>
                  <AircraftRow
                    aircraft={item}
                    aircraftId={aircraftId}
                    emphasis={emphasis}
                    selected={selected}
                    onSelectAircraft={onSelectAircraft}
                  />
                </RowFlipSurface>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}

// Subtle row surface refresh when a row moves to a new position.
// Separated from the outer motion.li so layout movement and flip transforms don't conflict.
function RowFlipSurface({ moved, moveToken, children }) {
  const reducedMotion = useReducedMotion();
  const controls = useAnimationControls();
  const prevToken = useRef(null);

  useEffect(() => {
    if (reducedMotion || !moved || moveToken === prevToken.current) return;
    prevToken.current = moveToken;

    void controls.start({
      rotateX: [0, -55, 0],
      opacity: [1, 0.78, 1],
      filter: ["brightness(1)", "brightness(1.14)", "brightness(1)"],
      transition: { duration: 0.38, ease: "easeOut" },
    });
  }, [controls, moveToken, moved, reducedMotion]);

  return (
    <motion.div animate={controls} className="aircraft-row-flip-surface">
      {children}
    </motion.div>
  );
}

function getScrollAnchor(scroller) {
  const scrollerRect = scroller.getBoundingClientRect();
  const rows = scroller.querySelectorAll("[data-aircraft-row-key]");

  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    if (rect.bottom <= scrollerRect.top) continue;
    return {
      key: row.dataset.aircraftRowKey,
      offset: rect.top - scrollerRect.top,
    };
  }

  return null;
}

function restoreScrollAnchor(scroller, anchor) {
  const row = scroller.querySelector(
    `[data-aircraft-row-key="${CSS.escape(anchor.key)}"]`,
  );
  if (!row) return;

  const scrollerRect = scroller.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const delta = rowRect.top - scrollerRect.top - anchor.offset;
  if (Math.abs(delta) >= 1) scroller.scrollTop += delta;
}
