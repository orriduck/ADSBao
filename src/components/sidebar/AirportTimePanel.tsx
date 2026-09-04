import { Clock3 } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useAirportTimeComparison } from "@/hooks/useAirportLocalTime";

export default function AirportTimePanel({
  airportTimeZone,
  loading = false,
}: {
  airportTimeZone: string;
  loading?: boolean;
}) {
  const { t, locale } = useI18n();
  const { airport, browser, differenceMinutes } = useAirportTimeComparison(airportTimeZone, locale);
  const magnitude = Math.abs(differenceMinutes ?? 0);
  const hours = Math.floor(magnitude / 60);
  const minutes = magnitude % 60;
  const duration = [
    hours ? t("sidebar.timeComparison.hours", { count: hours }) : "",
    minutes ? t("sidebar.timeComparison.minutes", { count: minutes }) : "",
  ].filter(Boolean).join(" ");
  const difference = differenceMinutes == null
    ? t(loading ? "sidebar.timeComparison.loading" : "sidebar.timeComparison.unavailable")
    : differenceMinutes === 0
      ? t("sidebar.timeComparison.same")
      : t(differenceMinutes > 0 ? "sidebar.timeComparison.ahead" : "sidebar.timeComparison.behind", { duration });

  return (
    <section className="airport-time-panel" aria-label={t("sidebar.timeComparison.title")}>
      <div className="airport-time-panel__heading">
        <h2>{t("sidebar.timeComparison.title")}</h2>
        <Clock3 aria-hidden="true" />
      </div>
      <p className="airport-time-panel__difference">{difference}</p>
      <dl className="airport-time-panel__clocks">
        {([
          ["airport", airport],
          ["browser", browser],
        ] as const).map(([kind, clock]) => (
          <div key={kind} className="airport-time-panel__clock">
            <dt>{t(`sidebar.timeComparison.${kind}`)}</dt>
            <dd>
              <div className="airport-time-panel__value">{clock.value}</div>
              {clock.date && <div className="airport-time-panel__date">{clock.date}</div>}
              {clock.zone && (
                <div className="airport-time-panel__zone">
                  {clock.timeZone.replaceAll("_", " ")} · {clock.zone}
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
