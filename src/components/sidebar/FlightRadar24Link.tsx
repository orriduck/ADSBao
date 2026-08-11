import { ExternalLink } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const FLIGHTAWARE_LOGO_URL = "https://www.flightaware.com/images/nav/flightaware-logo.png";
const FLIGHTRADAR24_LOGO_URL =
  "https://wp.logos-download.com/wp-content/uploads/2022/12/Flightradar24_Logo.svg?dl";
const FLIGHTRADAR24_DARK_LOGO_URL = "/flightradar24-dark.svg";

export default function FlightRadar24Link({
  identifier,
  flightAwareHref,
  flightRadarHref,
}: {
  identifier?: string;
  flightAwareHref?: string;
  flightRadarHref?: string;
}) {
  const { t } = useI18n();
  const label = String(identifier || "").trim();
  const flightAwareDestination = String(flightAwareHref || "").trim();
  const flightRadarDestination = String(flightRadarHref || "").trim();
  if (!label || (!flightAwareDestination && !flightRadarDestination)) return null;

  return (
    <div className="flex h-10 w-full items-center justify-end gap-3 px-3 pt-3 text-atc-dim [background:linear-gradient(180deg,transparent_0,transparent_14px,var(--atc-control-surface-muted)_14px,var(--atc-control-surface-muted)_44%,color-mix(in_oklab,var(--atc-mint)_58%,var(--atc-control-surface-muted))_100%)]">
      {flightAwareDestination ? (
        <a
          href={flightAwareDestination}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex h-6 shrink-0 items-center gap-1.5 rounded-[var(--atc-radius-pill)] px-1 text-atc-dim transition-[background,color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)] hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-2"
          aria-label={t("sidebar.openOnFlightAware", { identifier: label })}
        >
          <img
            src={FLIGHTAWARE_LOGO_URL}
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[55px] object-contain dark:brightness-0 dark:invert"
            decoding="async"
          />
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
        </a>
      ) : null}
      {flightRadarDestination ? (
        <a
          href={flightRadarDestination}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex h-6 shrink-0 items-center gap-1.5 rounded-[var(--atc-radius-pill)] px-1 text-atc-dim transition-[background,color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)] hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-2"
          aria-label={t("sidebar.openOnFlightRadar24", { identifier: label })}
        >
          <span className="relative h-[18px] w-[75px] shrink-0">
            <img
              src={FLIGHTRADAR24_LOGO_URL}
              alt=""
              aria-hidden="true"
              className="size-full dark:hidden"
              decoding="async"
            />
            <img
              src={FLIGHTRADAR24_DARK_LOGO_URL}
              alt=""
              aria-hidden="true"
              className="hidden size-full dark:block"
              decoding="async"
            />
          </span>
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
        </a>
      ) : null}
    </div>
  );
}
