import { useMemo, useState } from "react";
import { useAirportWiki } from "../../hooks/useAirportWiki";
import { useWeatherSlides } from "@/components/weather/useWeatherSlides";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import AsyncStatusLine from "@/components/ui/AsyncStatusLine";

// Two audiences, two densities. The METAR view leads with the flight-rules
// hero and the coded report for enthusiasts; the Local view is the friendly
// Open-Meteo picture (current conditions + hourly) for everyone else. A quiet
// capsule segment switches between them — they are never merged into one card.
const LOCAL_SLIDE_IDS = ["local", "wind", "hourly"];
const METAR_SLIDE_IDS = ["rules", "metar", "ceiling", "wind", "temp", "pressure"];

export default function WeatherBriefingStack({
  icao = "",
  iata = "",
  name = "",
  city = "",
  country = "",
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  metarStatusCode = null,
  airportCode = "",
  airportLat = 0,
  airportLon = 0,
  nearMe = false,
}) {
  const { t } = useI18n();
  // Default to the operating picture (flight-rules hero); general users can
  // switch to Local. Near-me has no METAR, so it is Local-only.
  const [view, setView] = useState("metar");
  const wikiAirport = useMemo(
    () => ({ icao, iata, name, city, country }),
    [icao, iata, name, city, country],
  );
  const { slides, windFlowBearing } = useWeatherSlides({
    variant: "carousel",
    metar,
    metarRaw,
    metarLoading,
    metarError,
    metarStatusCode,
    airportCode,
    airportLat,
    airportLon,
    nearMe,
  });
  const wiki = useAirportWiki(wikiAirport);

  const slideById = useMemo(
    () => new Map(slides.map((slide) => [slide.id, slide])),
    [slides],
  );
  const effectiveView = nearMe ? "local" : view;
  const activeSlides = useMemo(() => {
    const ids = nearMe
      ? ["hourly"]
      : effectiveView === "local"
        ? LOCAL_SLIDE_IDS
        : METAR_SLIDE_IDS;
    return ids.map((id) => slideById.get(id)).filter(Boolean);
  }, [effectiveView, nearMe, slideById]);

  return (
    <div className="airport-briefing-stack">
      {!nearMe ? (
        <div className="weather-view-segment" role="tablist" aria-label={t("panels.weather")}>
          {[
            { id: "metar", label: "METAR" },
            { id: "local", label: t("weather.local") },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={effectiveView === item.id}
              data-active={effectiveView === item.id ? "true" : undefined}
              onClick={() => setView(item.id)}
              className="weather-view-segment__btn group relative flex-1 rounded-[calc(var(--atc-radius-pill)_-_3px)] border border-transparent px-3 py-1 text-center text-[10px] uppercase tracking-[0.1em] text-atc-dim transition-[background,color,box-shadow] duration-200 hover:text-atc-text data-[active=true]:[background:var(--atc-glass-active-bg)] data-[active=true]:text-[var(--atc-click-fg)] data-[active=true]:shadow-[var(--atc-glass-rim-shadow)] data-[active=true]:[backdrop-filter:var(--atc-glass-active-frost)] data-[active=true]:hover:[background:var(--atc-glass-active-bg)] data-[active=true]:hover:text-[var(--atc-click-fg)]"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div key={effectiveView} className="app-panel-transition weather-view-panel">
        {activeSlides.map((slide) => {
          const showWindStreaks = slide.id === "wind" && windFlowBearing != null;
          return (
            <section
              key={slide.id}
              className={`airport-briefing-card ${
                showWindStreaks ? "airport-briefing-card--wind" : ""
              }`}
              style={
                showWindStreaks
                  ? ({ "--wind-flow": `${windFlowBearing}deg` } as any)
                  : undefined
              }
            >
              {showWindStreaks ? (
                <div
                  className="airport-briefing-card__streaks"
                  aria-hidden="true"
                />
              ) : null}
              <div className="airport-briefing-card__heading">
                <span>{slide.navLabel || slide.label}</span>
              </div>
              {slide.content}
            </section>
          );
        })}

        {!nearMe && effectiveView === "local" ? (
          <section className="airport-briefing-card airport-briefing-card--wiki">
            <div className="airport-briefing-card__heading">
              <span>{t("panels.wiki")}</span>
            </div>
            <p className="wiki-copy">
              {wiki.summary?.extract
                ? wiki.summary.extract
                : wiki.loading
                  ? t("panels.wikiLoading")
                  : t("panels.wikiMissing")}
            </p>
            <AsyncStatusLine
              loading={Boolean(wiki.loading)}
              error={wiki.error || null}
              statusCode={wiki.statusCode ?? null}
              cycleKey={`${icao || iata || name || "wiki"}`}
              pendingLabel={t("panels.wikiLoading")}
              successLabel={t("panels.wikiLoaded")}
              errorLabel={t("panels.wikiLoadError")}
              className="mt-1"
            />
            {wiki.summary?.url ? (
              <a
                className="airport-briefing-card__link"
                href={wiki.summary.url}
                target="_blank"
                rel="noreferrer"
              >
                {t("panels.openWikipedia")}
              </a>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
