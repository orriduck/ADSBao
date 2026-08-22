import { useI18n } from "@/features/app-shell/i18n/useI18n";

const FLIGHTAWARE_LOGO_URL = "https://www.flightaware.com/images/nav/flightaware-logo.png";
const FLIGHTRADAR24_LOGO_URL =
  "https://wp.logos-download.com/wp-content/uploads/2022/12/Flightradar24_Logo.svg?dl";

export default function FlightRadar24Link({
  identifier,
  subject,
  flightAwareHref,
  flightRadarHref,
}: {
  identifier?: string;
  subject: "airport" | "aircraft";
  flightAwareHref?: string;
  flightRadarHref?: string;
}) {
  const { t } = useI18n();
  const label = String(identifier || "").trim();
  const flightAwareDestination = String(flightAwareHref || "").trim();
  const flightRadarDestination = String(flightRadarHref || "").trim();
  if (!label || (!flightAwareDestination && !flightRadarDestination)) return null;

  const prompt = t(subject === "airport" ? "sidebar.openThisAirportOn" : "sidebar.openThisAircraftOn");

  return (
    <div className="provider-link-row">
      <span aria-hidden="true" className="provider-link-row__rail" />
      <span className="provider-link-row__content">
        <span className="min-w-0 truncate text-[calc(10px*var(--sb-body-scale))]">{prompt}</span>
        <span className="flex shrink-0 items-center gap-1">
          {flightAwareDestination ? (
            <a
              href={flightAwareDestination}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="relative flex h-6 shrink-0 items-center text-inherit before:absolute before:-inset-1 before:content-[''] focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2"
              aria-label={t("sidebar.openOnFlightAware", { identifier: label })}
            >
              <img
                src={FLIGHTAWARE_LOGO_URL}
                alt=""
                aria-hidden="true"
                className="provider-logo-monochrome h-[15px] w-[42px] object-contain"
                decoding="async"
              />
            </a>
          ) : null}
          {flightRadarDestination ? (
            <a
              href={flightRadarDestination}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="relative flex h-6 shrink-0 items-center text-inherit before:absolute before:-inset-1 before:content-[''] focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2"
              aria-label={t("sidebar.openOnFlightRadar24", { identifier: label })}
            >
              <span className="relative h-[18px] w-[71px] shrink-0">
                <img
                  src={FLIGHTRADAR24_LOGO_URL}
                  alt=""
                  aria-hidden="true"
                  className="provider-logo-monochrome size-full"
                  decoding="async"
                />
              </span>
            </a>
          ) : null}
        </span>
      </span>
    </div>
  );
}
