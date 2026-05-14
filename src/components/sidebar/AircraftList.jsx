"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../features/airport-context/airportContextUiModel.js";
import AircraftRow from "./AircraftRow.jsx";

const SLOT_FADE_DURATION_MS = 320;
const SLOT_FADE_SWAP_MS = 150;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export default function AircraftList({
  aircraft = [],
  altitudeFocus = "all",
  showAirspaceContext = true,
  selectedAircraftId = "",
  onSelectAircraft,
}) {
  const listRef = useRef(null);
  const scrollAnchor = useRef(null);
  const timers = useRef([]);
  const pendingAircraft = useRef(aircraft);
  const displayedAircraftRef = useRef(aircraft);
  const animating = useRef(false);
  const [displayedAircraft, setDisplayedAircraft] = useState(() => aircraft);
  const [fadingSlots, setFadingSlots] = useState(() => new Set());
  const incomingKeys = useMemo(() => buildRowKeySignature(aircraft), [aircraft]);

  useEffect(() => {
    pendingAircraft.current = aircraft;

    if (animating.current) return;

    const changedSlots = getChangedSlotIndexes(
      displayedAircraftRef.current,
      aircraft,
    );

    if (changedSlots.length === 0 || prefersReducedMotion()) {
      displayedAircraftRef.current = aircraft;
      setDisplayedAircraft(aircraft);
      setFadingSlots(new Set());
      return;
    }

    startSlotFade(aircraft, changedSlots);
  }, [aircraft, incomingKeys]);

  useEffect(
    () => () => {
      clearTimers(timers.current);
    },
    [],
  );

  useLayoutEffect(() => {
    const scroller = listRef.current?.parentElement;
    if (!scroller) return undefined;

    const remember = () => {
      scrollAnchor.current = getScrollAnchor(scroller);
    };

    remember();
    scroller.addEventListener("scroll", remember, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", remember);
    };
  }, []);

  function startSlotFade(nextAircraft, changedSlots) {
    const scroller = listRef.current?.parentElement;
    if (scroller && scrollAnchor.current) {
      restoreScrollAnchor(scroller, scrollAnchor.current);
    }

    clearTimers(timers.current);
    animating.current = true;
    setFadingSlots(new Set(changedSlots));

    timers.current = [
      window.setTimeout(() => {
        displayedAircraftRef.current = nextAircraft;
        setDisplayedAircraft(nextAircraft);
        if (scroller) scrollAnchor.current = getScrollAnchor(scroller);
      }, SLOT_FADE_SWAP_MS),
      window.setTimeout(() => {
        animating.current = false;
        setFadingSlots(new Set());

        const pending = pendingAircraft.current;
        const nextChangedSlots = getChangedSlotIndexes(
          displayedAircraftRef.current,
          pending,
        );
        if (nextChangedSlots.length > 0 && !prefersReducedMotion()) {
          startSlotFade(pending, nextChangedSlots);
          return;
        }

        displayedAircraftRef.current = pending;
        setDisplayedAircraft(pending);
        if (scroller) scrollAnchor.current = getScrollAnchor(scroller);
      }, SLOT_FADE_DURATION_MS),
    ];
  }

  return (
    <ul ref={listRef} className="aircraft-table-list">
      {displayedAircraft.map((item, index) => {
        const aircraftId = getAircraftIdentity(item);
        const rowKey = getAircraftRowKey(item);
        const selected = aircraftId && aircraftId === selectedAircraftId;
        const isFading = fadingSlots.has(index);
        const emphasis = resolveAircraftContextEmphasis({
          aircraft: item,
          altitudeFocus,
          contextEnabled: showAirspaceContext,
          selected,
        });

        return (
          <li
            key={`aircraft-slot-${index}`}
            className={`aircraft-table-list__item ${
              isFading ? "aircraft-table-list__item--fading" : ""
            }`}
            data-aircraft-row-key={rowKey}
          >
            <AircraftRow
              aircraft={item}
              aircraftId={aircraftId}
              emphasis={emphasis}
              selected={selected}
              pauseMotion={isFading}
              onSelectAircraft={onSelectAircraft}
            />
          </li>
        );
      })}
    </ul>
  );
}

function getAircraftRowKey(aircraft = {}) {
  const identity = getAircraftIdentity(aircraft);
  return identity || aircraft.callsign || "anon";
}

function buildRowKeySignature(aircraft = []) {
  return aircraft.map((item) => getAircraftRowKey(item)).join("|");
}

function getChangedSlotIndexes(currentAircraft = [], nextAircraft = []) {
  const maxLength = Math.max(currentAircraft.length, nextAircraft.length);
  const changed = [];

  for (let index = 0; index < maxLength; index += 1) {
    if (
      getAircraftRowKey(currentAircraft[index]) !==
      getAircraftRowKey(nextAircraft[index])
    ) {
      changed.push(index);
    }
  }

  return changed;
}

function clearTimers(timerIds = []) {
  timerIds.forEach((timerId) => window.clearTimeout(timerId));
  timerIds.length = 0;
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
