"use client";

import { useMemo } from "react";
import { useAirportWiki } from "../../hooks/useAirportWiki.js";
import { useWeatherSlides } from "../../features/weather/useWeatherSlides.jsx";

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
  airportCode = "",
  airportLat = 0,
  airportLon = 0,
}) {
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
          <span>Wiki</span>
        </div>
        <p className="wiki-copy">
          {wiki.summary?.extract
            ? wiki.summary.extract
            : wiki.loading
              ? "Loading airport introduction..."
              : "No Wikipedia summary was found for this airport."}
        </p>
        {wiki.error ? <div className="panel-error">{wiki.error}</div> : null}
        {wiki.summary?.url ? (
          <a
            className="airport-briefing-card__link"
            href={wiki.summary.url}
            target="_blank"
            rel="noreferrer"
          >
            Open Wikipedia
          </a>
        ) : null}
      </section>
    </div>
  );
}
