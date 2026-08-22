import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function PublicConcourseBoundary({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <section
      className={`public-concourse-boundary ${className}`.trim()}
      aria-label={t("publicBoundary.notice")}
    >
      <span
        aria-hidden="true"
        className="public-concourse-boundary__rail"
      />
      <div className="public-concourse-boundary__body">
        <span className="public-concourse-boundary__label">
          {t("publicBoundary.label")}
        </span>
        <p className="public-concourse-boundary__notice">
          {t("publicBoundary.notice")}
        </p>
      </div>
    </section>
  );
}
