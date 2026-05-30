"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import AircraftRow from "./AircraftRow.jsx";
import AirportRow from "./AirportRow.jsx";

const ROW_HEIGHT_PX = 64;
const OVERSCAN_ROWS = 6;
const ENTER_ANIMATION_MS = 260;

// Windowed render for the nearby list. Both aircraft and airport rows live in
// a single scroll container so the virtualizer can manage them as one stream.
// Stable per-item keys (icao for airports, callsign/icao24 for aircraft) let
// React preserve component identity across scrolls so NumberFlow inside each
// row keeps its animation state instead of remounting.
export default function VirtualNearbyList({
  items,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  onSelectAircraft,
  onSelectAirport,
  resetSignal,
}) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: OVERSCAN_ROWS,
    getItemKey: (index) => items[index]?.id ?? index,
  });

  // Track which item ids were present in the previous render so we can mark
  // genuinely-new rows for the enter animation. Rows that scroll back into the
  // virtual window are already in this set and stay static — only data-driven
  // additions (a new aircraft, a filter change, a fresh resetSignal) animate.
  // Tracking the previously-rendered ids in a ref keeps the enter animation
  // scoped to genuine data changes — scrolling a known id back into the
  // virtual window leaves it untouched. resetSignal (filter / selection
  // change) wipes the ref before flags are computed, so the post-reset list
  // animates in as a unit instead of flickering only the rare new identity.
  const seenIdsRef = useRef(new Set());
  const lastResetRef = useRef(resetSignal);
  const enterFlags = useMemo(() => {
    if (lastResetRef.current !== resetSignal) {
      seenIdsRef.current = new Set();
      lastResetRef.current = resetSignal;
    }
    const flags = new Map();
    for (const item of items) {
      flags.set(item.id, !seenIdsRef.current.has(item.id));
    }
    return flags;
  }, [items, resetSignal]);

  useEffect(() => {
    seenIdsRef.current = new Set(items.map((item) => item.id));
  }, [items]);

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [resetSignal]);

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{ height: `${totalSize}px`, position: "relative", width: "100%" }}
      >
        {virtualRows.map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          const isFirst = virtualRow.index === 0;
          return (
            <NearbyVirtualRow
              key={virtualRow.key}
              index={virtualRow.index}
              start={virtualRow.start}
              size={virtualRow.size}
              isFirst={isFirst}
              shouldAnimateEnter={enterFlags.get(item.id) === true}
              item={item}
              selectedAircraftId={selectedAircraftId}
              selectedAirportIcao={selectedAirportIcao}
              onSelectAircraft={onSelectAircraft}
              onSelectAirport={onSelectAirport}
            />
          );
        })}
      </div>
    </div>
  );
}

function NearbyVirtualRow({
  index,
  start,
  size,
  isFirst,
  shouldAnimateEnter,
  item,
  selectedAircraftId,
  selectedAirportIcao,
  onSelectAircraft,
  onSelectAirport,
}) {
  // `entering` toggles the keyframes class. It's initialised from the parent's
  // flag at mount, but rows can also be reused across filter changes (same key,
  // new shouldAnimateEnter prop) — the second effect re-triggers the animation
  // in that case. The first effect times the class off after the keyframes
  // have run their full course.
  const [entering, setEntering] = useState(shouldAnimateEnter);
  useEffect(() => {
    if (shouldAnimateEnter) setEntering(true);
  }, [shouldAnimateEnter]);
  useEffect(() => {
    if (!entering) return undefined;
    const timer = window.setTimeout(
      () => setEntering(false),
      ENTER_ANIMATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [entering]);

  return (
    <div
      data-index={index}
      className={`absolute left-0 top-0 w-full ${
        isFirst ? "" : "border-t border-atc-line"
      } [perspective:800px]`}
      style={{
        height: `${size}px`,
        transform: `translateY(${start}px)`,
      }}
    >
      <div className={entering ? "nearby-row-enter" : ""}>
        {item.type === "aircraft" ? (
          <AircraftRow
            aircraft={item.data}
            aircraftId={item.id}
            selected={item.id === selectedAircraftId}
            onSelectAircraft={onSelectAircraft}
          />
        ) : (
          <AirportRow
            airport={item.data}
            airportId={item.data?.icao}
            selected={item.data?.icao === selectedAirportIcao}
            onSelectAirport={onSelectAirport}
          />
        )}
      </div>
    </div>
  );
}
