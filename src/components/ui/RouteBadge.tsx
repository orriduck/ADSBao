import { useState } from "react";
import { markAirlineLogoUnavailable } from "@/features/aviation/airlineLogoModel";
import { cn } from "@/lib/utils";

/**
 * RouteBadge — a compact frosted pill showing an origin→destination route.
 *
 * Two variants only:
 *   • WITH IMAGE — an airline logo sits at the left end and radial-fades into
 *     the frost (U-shaped fade opening toward the left edge); the codes sit in
 *     the clear middle, always above the image. No airline name/text.
 *   • NO IMAGE — a plain frosted pill with just the codes.
 *
 * There is no country-flag variant. Renders NOTHING when from/to are missing.
 * Neutral frost only — no signal accent. Shell tint + hairline derive from
 * --atc-text so light/dark retune without forking the glass tokens.
 */
export interface RouteBadgeProps {
  /** Origin airport code (ICAO, e.g. "KBOS"). */
  from: string;
  /** Destination airport code (ICAO, e.g. "KATL"). */
  to: string;
  /** Airline logo URL (e.g. /api/proxy/airlines/DAL). Omit/empty → no-image. */
  airlineLogoUrl?: string;
  /** Lower-confidence (adsbdb) route — shows a faint trailing marker. */
  uncertain?: boolean;
  className?: string;
}

// U-shaped radial mask: solid at the left edge, fading inward so only the
// logo's edge-anchored center shows and it never sits under the codes.
const LOGO_MASK =
  "radial-gradient(ellipse 140% 120% at 0% 50%, #000 0%, #000 32%, transparent 82%)";

export default function RouteBadge({
  from,
  to,
  airlineLogoUrl,
  uncertain = false,
  className,
}: RouteBadgeProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  if (!from || !to) return null;

  const hasLogo = Boolean(airlineLogoUrl) && !logoFailed;

  return (
    <span
      className={cn(
        "relative inline-flex h-4 select-none items-center overflow-hidden rounded-full font-sans",
        "bg-[color-mix(in_oklab,var(--atc-text)_5%,transparent)]",
        "shadow-[inset_0_0_0_0.5px_color-mix(in_oklab,var(--atc-text)_12%,transparent)]",
        hasLogo ? "pl-[18px] pr-2" : "px-2",
        className,
      )}
    >
      {hasLogo ? (
        <img
          src={airlineLogoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => {
            markAirlineLogoUnavailable(airlineLogoUrl);
            setLogoFailed(true);
          }}
          className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-[24px] object-cover object-left opacity-90 [-webkit-mask-image:var(--route-badge-logo-mask)] [mask-image:var(--route-badge-logo-mask)]"
          style={{ ["--route-badge-logo-mask" as string]: LOGO_MASK }}
        />
      ) : null}

      <span
        className="notranslate relative z-[2] inline-flex items-baseline gap-1 text-[calc(9.5px*var(--sb-body-scale,1))] font-normal leading-none tracking-[0.2px] text-atc-text"
        translate="no"
      >
        {from}
        <span aria-hidden="true" className="text-[0.82em] text-atc-dim">
          →
        </span>
        {to}
        {uncertain ? (
          <span
            aria-hidden="true"
            title="Approximate route (callsign reference data)"
            className="ml-px text-[0.74em] leading-none text-atc-faint"
          >
            *
          </span>
        ) : null}
      </span>
    </span>
  );
}
