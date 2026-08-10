import { ExternalLink } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const FLIGHTRADAR24_LOGO_URL =
  "https://wp.logos-download.com/wp-content/uploads/2022/12/Flightradar24_Logo.svg?dl";

export default function FlightRadar24Link({
  identifier,
  href,
}: {
  identifier?: string;
  href?: string;
}) {
  const { t } = useI18n();
  const label = String(identifier || "").trim();
  const destination = String(href || "").trim();
  if (!label || !destination) return null;

  return (
    <a
      href={destination}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex h-10 w-full items-center justify-between gap-3 px-3 pt-3 text-[calc(10px*var(--sb-body-scale))] font-semibold text-atc-dim [background:linear-gradient(180deg,transparent_0,transparent_14px,var(--atc-control-surface-muted)_14px,var(--atc-control-surface-muted)_44%,color-mix(in_oklab,var(--atc-mint)_58%,var(--atc-control-surface-muted))_100%)] transition-[background,color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)] hover:[background:linear-gradient(180deg,transparent_0,transparent_14px,var(--atc-control-surface-hover)_14px,var(--atc-control-surface-hover)_44%,color-mix(in_oklab,var(--atc-mint)_68%,var(--atc-control-surface-hover))_100%)] hover:text-atc-text active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-2"
      aria-label={t("sidebar.openOnFlightRadar24", { identifier: label })}
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap">
        <span className="truncate">{t("sidebar.openOnFlightRadar24LogoPrefix", { identifier: label })}</span>
        <span className="flex h-[15px] w-[60px] shrink-0 items-center justify-center rounded-[2px] bg-[#f7f7f1]/95 px-[2px]">
          <img
            src={FLIGHTRADAR24_LOGO_URL}
            alt=""
            aria-hidden="true"
            className="h-[13px] w-[56px]"
            decoding="async"
          />
        </span>
        <span className="truncate">{t("sidebar.openOnFlightRadar24LogoSuffix", { identifier: label })}</span>
      </span>
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
    </a>
  );
}
