import { useEffect, useRef, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import {
  airportDirectoryCode,
  airportDisplayName,
  airportSubtitle,
} from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { AirportListRow } from "./AirportListRow";

const PREFETCH_INTENT_DELAY_MS = 120;

export default function AirportRow({
  airport,
  onOpen,
  onPrefetch,
  featured = false,
  motionOrder = 0,
}) {
  const { locale } = useI18n();
  const motionStyle = {
    "--rail-motion-delay": `${28 + motionOrder * 18}ms`,
  } as CSSProperties;
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

  // Search results share the home discovery row. The featured best-match row
  // reads as the obvious pick through luminance only — a quiet inked wash and
  // a fully-inked chip, not a color shift.
  return (
    <li
      style={motionStyle}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
      onFocus={schedulePrefetch}
      onBlur={cancelPrefetch}
      onMouseDown={cancelPrefetch}
    >
      <AirportListRow
        as="button"
        active={featured}
        className="airport-list-row--directory"
        onClick={() => onOpen(airport)}
        pill={airportDirectoryCode(airport)}
        railMotionKind="code"
        title={airportDisplayName(airport, locale)}
        subtitle={airportSubtitle(airport, locale)}
        trailing={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
      />
    </li>
  );
}
