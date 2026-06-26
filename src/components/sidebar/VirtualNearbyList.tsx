import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import AircraftRow from "./AircraftRow";
import AirportRow from "./AirportRow";
import CardFlipSlot from "./CardFlipSlot";
import { useSidebarScrollRef } from "./SidebarScrollContext";

// Rows are a fixed 42px (single-line, see AircraftRow / AirportRow), so this
// estimate matches the measured height and the list never jitters before
// measurement settles.
const ROW_HEIGHT_ESTIMATE_PX = 42;
const OVERSCAN_ROWS = 6;
const ENTER_ANIMATION_MS = 300;

// Windowed render for the nearby list. Both aircraft and airport rows live in
// a single scroll container so the virtualizer can manage them as one stream.
// Stable per-item keys (icao for airports, callsign/icao24 for aircraft) let
// React preserve component identity across scrolls so rows do not remount while
// the user scrolls dense airport lists.
export default function VirtualNearbyList({
  items,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  onSelectAircraft,
  onSelectAirport,
  resetSignal,
}) {
  // The list does NOT own a scroll container. The whole sidebar scrolls as
  // one region (the shell panel), so the list windows against that shared
  // scroll element and offsets its virtual items by `scrollMargin` — the
  // distance from the top of the scroll content down to where the list
  // begins (the identity + hero + filters above it).
  const scrollRef = useSidebarScrollRef();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const scrollEl = scrollRef?.current;
    const listEl = listRef.current;
    if (!scrollEl || !listEl) return undefined;
    let raf = 0;
    const measure = () => {
      const top =
        listEl.getBoundingClientRect().top -
        scrollEl.getBoundingClientRect().top +
        scrollEl.scrollTop;
      setScrollMargin((prev) => (Math.abs(prev - top) > 0.5 ? top : prev));
    };
    measure();
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scrollEl);
    observer.observe(listEl);
    // The body wraps the header (identity + hero + filters) above the list,
    // so its height changing — e.g. the airport name resolving — must
    // recompute where the list starts.
    const body = scrollEl.querySelector(".sidebar-shell-body");
    if (body) observer.observe(body);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [scrollRef, items.length]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef?.current ?? null,
    estimateSize: () => ROW_HEIGHT_ESTIMATE_PX,
    overscan: OVERSCAN_ROWS,
    getItemKey: (index) => items[index]?.id ?? index,
    scrollMargin,
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

  // On a filter/selection reset, snap back to the top of the list — but only
  // when the user has already scrolled down into it, so changing a filter
  // while the header is in view doesn't yank the whole sidebar.
  useEffect(() => {
    const scrollEl = scrollRef?.current;
    if (!scrollEl) return;
    if (scrollEl.scrollTop > scrollMargin) {
      scrollEl.scrollTo({ top: scrollMargin });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // Re-measure only when the list itself changes — NOT on selection. Selecting
  // a row only swaps its background/rail colour (no height change), so forcing
  // a full re-measure on every click was pure layout thrash.
  useEffect(() => {
    virtualizer.measure();
  }, [items.length, resetSignal, virtualizer]);

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={listRef}
      className="app-virtual-list-motion relative w-full"
      style={{ height: `${totalSize}px` }}
    >
      <div>
        {virtualRows.map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          // Resolve selection to a per-row boolean here so the memoized row
          // only re-renders when ITS own selection flips — selecting a
          // different row no longer re-renders every visible row.
          const selected =
            item.type === "aircraft"
              ? item.id === selectedAircraftId
              : item.data?.icao === selectedAirportIcao;
          return (
            <NearbyVirtualRow
              ref={virtualizer.measureElement}
              key={item.id}
              index={virtualRow.index}
              start={virtualRow.start - scrollMargin}
              shouldAnimateEnter={enterFlags.get(item.id) === true}
              item={item}
              selected={selected}
              onSelectAircraft={onSelectAircraft}
              onSelectAirport={onSelectAirport}
            />
          );
        })}
      </div>
    </div>
  );
}

const NearbyVirtualRow = memo(function NearbyVirtualRow({
  ref,
  index,
  start,
  shouldAnimateEnter,
  item,
  selected,
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

  // No inline height — the row's actual height comes from the AircraftRow /
  // AirportRow content, and virtualizer.measureElement (attached via the
  // forwarded ref) observes it through a ResizeObserver so totalSize and
  // every subsequent row's `start` offset stay in sync across responsive
  // breakpoints. Forcing a fixed height here would re-introduce the gap
  // bug at viewports where the .airport-map-kit override compresses the
  // card from 64px down to 51px.
  return (
    <div
      ref={ref}
      data-index={index}
      className="absolute left-0 top-0 w-full"
      style={{
        transform: `translateY(${start}px)`,
      }}
    >
      <CardFlipSlot
        swapKey={item.id}
        value={item}
        disabled={entering || shouldAnimateEnter}
      >
        {(displayed, swapState) => (
          <div className={entering ? "nearby-row-enter" : ""}>
            {displayed.type === "aircraft" ? (
              <AircraftRow
                aircraft={displayed.data}
                aircraftId={displayed.id}
                selected={swapState.phase !== "erasing" && selected}
                onSelectAircraft={onSelectAircraft}
              />
            ) : (
              <AirportRow
                airport={displayed.data}
                airportId={displayed.data?.icao}
                selected={selected}
                onSelectAirport={onSelectAirport}
              />
            )}
          </div>
        )}
      </CardFlipSlot>
    </div>
  );
});
