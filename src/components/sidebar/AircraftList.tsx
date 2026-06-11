"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef } from "react";
import { useListReorderMotion } from "@/animations/useListReorderMotion";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import AircraftRow from "./AircraftRow";

export default function AircraftList({
  aircraft = [],
  resetKey,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const motionKey = useMemo(
    () =>
      aircraft
        .map((item, index) => getAircraftIdentity(item) || `aircraft:${index}`)
        .join("|"),
    [aircraft],
  );
  useListReorderMotion(listRef, motionKey, { resetKey });

  return (
    <ul
      key={resetKey}
      ref={listRef}
      className="app-list-motion divide-y divide-atc-line"
    >
      {aircraft.map((item, index) => {
        const aircraftId = getAircraftIdentity(item);
        const motionStyle = {
          "--motion-order": Math.min(index, 5),
        } as CSSProperties;
        return (
          <li
            key={aircraftId || index}
            data-gsap-reorder-key={aircraftId || `aircraft:${index}`}
            className="relative list-none [perspective:800px]"
            style={motionStyle}
          >
            <AircraftRow
              aircraft={item}
              aircraftId={aircraftId}
              selected={Boolean(aircraftId) && aircraftId === selectedAircraftId}
              onSelectAircraft={onSelectAircraft}
            />
          </li>
        );
      })}
    </ul>
  );
}
