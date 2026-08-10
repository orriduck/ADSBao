import { ExternalLink } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

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
      className="mx-[var(--airport-sidebar-inset)] mt-2 flex h-8 items-center justify-between gap-3 rounded-[var(--atc-radius-control)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-muted)] px-3 text-[calc(10px*var(--sb-body-scale))] font-semibold text-atc-dim transition-[background-color,color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)] hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-2"
      aria-label={t("sidebar.openOnFlightRadar24", { identifier: label })}
    >
      <span className="min-w-0 truncate">{t("sidebar.openOnFlightRadar24", { identifier: label })}</span>
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
    </a>
  );
}
