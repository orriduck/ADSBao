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
import { useSidebarScrollElement } from "./SidebarScrollContext";

// Rows are a fixed 42px (single-line, see AircraftRow / AirportRow), so this
// estimate matches the measured height and the list never jitters before
// measurement settles.
const ROW_HEIGHT_ESTIMATE_PX = 44;
const OVERSCAN_ROWS = 6;
const ENTER_ANIMATION_MS = 300;

type NearbyItem = {
  id: string;
  type: "aircraft" | "airport";
  data: any;
};

type NearbyVirtualRowProps = {
  index: number;
  start: number;
  shouldAnimateEnter: boolean;
  item: NearbyItem;
  selected: boolean;
  onSelectAircraft?: (...args: any[]) => void;
  onSelectAirport?: (...args: any[]) => void;
};

// Progressive reveal: only the first slice of the (already filtered/sorted)
// list is fed to the virtualizer, growing by a page as the user scrolls toward
// the end. Virtualization still windows the rendered DOM, but capping the
// stream keeps the per-render bookkeeping (enter flags, seen-ids, item keys)
// and the virtualizer's own count bounded to what the user has actually
// reached — most sessions never scroll past the first page.
const INITIAL_VISIBLE_ROWS = 30;
const VISIBLE_ROWS_STEP = 30;
// Grow the slice once the rendered window comes within this many rows of the
// current end, so more rows are ready before the user hits the bottom.
const GROW_THRESHOLD_ROWS = 8;

// Windowed render for the nearby list. Both aircraft and airport rows live in
// a single scroll container so the virtualizer can manage them as one stream.
// Rows are keyed by POSITION (index), not identity: each slot stays fixed at
// its index and, when the list re-sorts, its occupant (CardFlipSlot's swapKey =
// item.id) changes and the content cross-fades in place — rows never physically
// slide. Scrolling only shifts which indices render, so a persisting slot keeps
// its occupant and never spuriously swaps.
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
  const scrollElement = useSidebarScrollElement();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // The shared sidebar may already be scrolled when this list remounts. Do not
  // let React Virtual build an initial range with the placeholder margin of 0:
  // that range starts a full header-height too far down and can survive the
  // later margin update. useLayoutEffect resolves the real list offset before
  // paint, then enables virtualization with the correct coordinate system.
  const [layoutReady, setLayoutReady] = useState(false);
  // Rows are a fixed height PER VIEWPORT (42px normally, ~51px where the
  // .airport-map-kit override compresses them). Measure it ONCE (and on resize,
  // in the same effect that tracks scrollMargin) and feed it as a fixed
  // estimateSize — instead of attaching a per-row ResizeObserver via
  // virtualizer.measureElement, whose getBoundingClientRect read on every
  // scroll frame is a forced synchronous layout (a top contributor to the
  // scroll-time pipeline stall).
  const [rowHeight, setRowHeight] = useState(ROW_HEIGHT_ESTIMATE_PX);

  // How many rows of `items` are currently revealed. Reset to the first page
  // whenever the filter/selection context changes (resetSignal) so a fresh cut
  // always starts at the top, then grows as the user scrolls toward the end.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
  }, [resetSignal]);

  const visibleItems = useMemo(
    () =>
      items.length <= visibleCount ? items : items.slice(0, visibleCount),
    [items, visibleCount],
  );
  const hasMore = items.length > visibleItems.length;

  useLayoutEffect(() => {
    let raf = 0;
    let observer: ResizeObserver | null = null;
    const measure = () => {
      const listEl = listRef.current;
      if (!scrollElement || !listEl) return;
      const top =
        listEl.getBoundingClientRect().top -
        scrollElement.getBoundingClientRect().top +
        scrollElement.scrollTop;
      setScrollMargin((prev) => (Math.abs(prev - top) > 0.5 ? top : prev));
      // Re-read the fixed row height from a rendered row. Rounded + compared
      // exactly so sub-pixel noise never flips it — it only changes on a real
      // viewport/context height change, replacing the per-row measurement.
      const firstRow = listEl.querySelector("[data-index]");
      const height = firstRow
        ? Math.round(firstRow.getBoundingClientRect().height)
        : 0;
      if (height > 0) {
        setRowHeight((prev) => (prev !== height ? height : prev));
      }
      setLayoutReady(true);
    };
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    };
    const listEl = listRef.current;
    if (!scrollElement || !listEl) {
      setLayoutReady(false);
      return;
    }

    // The context value changes when the parent callback ref attaches, so this
    // first measurement always has the real shared scroll owner. Virtualization
    // stays disabled until its scroll-margin coordinate system is valid.
    measure();
    observer = new ResizeObserver(schedule);
    observer.observe(scrollElement);
    observer.observe(listEl);
    // The body wraps the header (identity + hero + filters) above the list,
    // so its height changing — e.g. the airport name resolving — must
    // recompute where the list starts.
    const body = scrollElement.querySelector(".sidebar-shell-body");
    if (body) observer.observe(body);
    if (listEl.parentElement) observer.observe(listEl.parentElement);
    window.addEventListener("resize", schedule);
    // Deliberately NOT re-measured on scroll. scrollMargin is scroll-INVARIANT,
    // so reading getBoundingClientRect every scroll frame was pure waste — a
    // forced synchronous layout that stalls the compositor scroll (keeps the
    // scroll "payload" on the CPU instead of the GPU). Header growth that shifts
    // where the list starts (Flights card / airport name resolving) already
    // resizes the observed .sidebar-shell-body / list parent, so the
    // ResizeObserver above re-measures it off the scroll hot path.
    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [scrollElement, visibleItems.length]);

  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    enabled: layoutReady,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN_ROWS,
    // Key by POSITION, not identity: a slot stays put at its index and its
    // occupant changes when the list re-sorts (see CardFlipSlot), so rows never
    // physically slide — the content cross-fades in place instead.
    getItemKey: (index) => index,
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
    for (const item of visibleItems) {
      flags.set(item.id, !seenIdsRef.current.has(item.id));
    }
    return flags;
  }, [visibleItems, resetSignal]);

  useEffect(() => {
    seenIdsRef.current = new Set(visibleItems.map((item) => item.id));
  }, [visibleItems]);

  // On a filter/selection reset, snap back to the top of the list — but only
  // when the user has already scrolled down into it, so changing a filter
  // while the header is in view doesn't yank the whole sidebar.
  useEffect(() => {
    if (!scrollElement) return;
    if (scrollElement.scrollTop > scrollMargin) {
      scrollElement.scrollTo({ top: scrollMargin });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // Re-measure only when the list itself changes — NOT on selection. Selecting
  // a row only swaps its background/rail colour (no height change), so forcing
  // a full re-measure on every click was pure layout thrash.
  useEffect(() => {
    virtualizer.measure();
    // `scrollMargin` is discovered after the list mounts and can change again
    // when the flight/airport header resolves. Recompute the virtual range at
    // that point as well: otherwise React Virtual can retain the pre-header
    // range and place the first rendered row a full header-height below the
    // filters until the next user scroll.
  }, [
    layoutReady,
    visibleItems.length,
    resetSignal,
    rowHeight,
    scrollMargin,
    virtualizer,
  ]);

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Reveal the next page once the rendered window approaches the current end of
  // the revealed slice. Reading the last virtual index keeps this tied to what
  // the user has actually scrolled to, not raw scroll math.
  const lastRenderedIndex = virtualRows.length
    ? virtualRows[virtualRows.length - 1].index
    : -1;
  useEffect(() => {
    if (!hasMore) return;
    if (lastRenderedIndex >= visibleCount - GROW_THRESHOLD_ROWS) {
      setVisibleCount((count) => count + VISIBLE_ROWS_STEP);
    }
  }, [hasMore, lastRenderedIndex, visibleCount]);

  return (
    <div
      ref={listRef}
      className="app-virtual-list-motion relative w-full"
      style={{ height: `${totalSize}px` }}
    >
      <div>
        {virtualRows.map((virtualRow) => {
          const item = visibleItems[virtualRow.index];
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
              key={virtualRow.index}
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
  index,
  start,
  shouldAnimateEnter,
  item,
  selected,
  onSelectAircraft,
  onSelectAirport,
}: NearbyVirtualRowProps) {
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
