"use client";

import type { CSSProperties } from "react";
import { airportDisplayCode, airportDisplayName, airportSubtitle } from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { TextPillListItem } from "@/components/ui/TextPillListItem";

export default function AirportRow({
  airport,
  onOpen,
  featured = false,
  motionOrder = 0,
}) {
  const { locale } = useI18n();
  const motionStyle = { "--motion-order": motionOrder } as CSSProperties;

  // Search results render as the shared liquid-glass list tile (GSAP
  // hover/press lives inside the primitive). The featured best-match row
  // flips to the active glass capsule so it reads as the obvious pick.
  return (
    <li style={motionStyle}>
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
