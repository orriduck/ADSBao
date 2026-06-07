"use client";

import { useMemo } from "react";
import { useAirportWiki } from "../../hooks/useAirportWiki";
import { useWeatherSlides } from "@/components/weather/useWeatherSlides";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import AsyncStatusLine from "@/components/ui/AsyncStatusLine";

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
}) {
  const { t } = useI18n();
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
  });
  const wiki = useAirportWiki(wikiAirport);

  return (
    <div className="airport-briefing-stack">
      {slides.map((slide) => {
        const showWindStreaks = slide.id === "wind" && windFlowBearing != null;
        return (
          <section
            key={slide.id}
            className={`airport-briefing-card ${
              showWindStreaks ? "airport-briefing-card--wind" : ""
            }`}
            style={
              showWindStreaks
                ? { "--wind-flow": `${windFlowBearing}deg` }
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
    </div>
  );
}
