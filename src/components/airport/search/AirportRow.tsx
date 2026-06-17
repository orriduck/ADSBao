"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { airportDisplayCode, airportDisplayName, airportSubtitle } from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { TextPillListItem } from "@/components/ui/TextPillListItem";

const PREFETCH_INTENT_DELAY_MS = 120;

export default function AirportRow({
  airport,
  onOpen,
  onPrefetch,
  featured = false,
  motionOrder = 0,
}) {
  const { locale } = useI18n();
  const motionStyle = { "--motion-order": motionOrder } as CSSProperties;
  const prefetchTimerRef = useRef<number | null>(null);

  const cancelPrefetch = () => {
    if (prefetchTimerRef.current == null) return;
    window.clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  };

  const schedulePrefetch = () => {
    cancelPrefetch();
    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      onPrefetch?.(airport);
    }, PREFETCH_INTENT_DELAY_MS);
  };

  useEffect(() => cancelPrefetch, [airport, onPrefetch]);

  // Search results render as the shared liquid-glass list tile (GSAP
  // hover/press lives inside the primitive). The featured best-match row
  // flips to the active glass capsule so it reads as the obvious pick.
  return (
    <li
      style={motionStyle}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
      onFocus={schedulePrefetch}
      onBlur={cancelPrefetch}
      onMouseDown={cancelPrefetch}
    >
      <TextPillListItem
        as="button"
        active={featured}
        onClick={() => onOpen(airport)}
        pill={airportDisplayCode(airport)}
        title={airportDisplayName(airport, locale)}
        subtitle={airportSubtitle(airport, locale)}
      />
    </li>
  );
}
