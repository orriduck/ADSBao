"use client";

import { useMemo, useRef, useState } from "react";
import { useLocalWeather } from "../../hooks/useLocalWeather.js";
import {
  CeilingSlide,
  FlightRulesSlide,
  LocalWeatherSlide,
  MetarSlide,
  PressureSlide,
  TemperatureSlide,
  WindSlide,
} from "../weather/WeatherSlides";

export default function WeatherCarousel({
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  airportCode = "",
  airportLat = 0,
  airportLon = 0,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const {
    weather: localWeather,
    loading: localWeatherLoading,
    error: localWeatherError,
  } = useLocalWeather(airportLat, airportLon);

  const slides = useMemo(() => {
    const ceilingFt = getCeilingFeet(metar);
    const hasVisibility =
      metar?.rawVisib != null && Number.isFinite(Number(metar.rawVisib));
    const showCeiling = ceilingFt != null || hasVisibility;

    return [
      {
        id: "metar",
        label: "METAR",
        navLabel: "METAR",
        title: "Raw METAR",
        content: (
          <MetarSlide
            metarRaw={metarRaw}
            metarLoading={metarLoading}
            metarError={metarError}
          />
        ),
      },
      {
        id: "rules",
        label: "Rules",
        navLabel: "RULE",
        title: "Flight rules",
        content: <FlightRulesSlide metar={metar} />,
      },
      showCeiling
        ? {
            id: "ceiling",
            label: "Ceiling",
            navLabel: "C/V",
            title: "Ceiling / visibility",
            content: <CeilingSlide metar={metar} />,
          }
        : null,
      {
        id: "wind",
        label: "Wind",
        navLabel: "WIND",
        title: "Wind",
        content: <WindSlide metar={metar} localWeather={localWeather} />,
      },
      {
        id: "temp",
        label: "Temp",
        navLabel: "TEMP",
        title: "Temperature",
        content: (
          <TemperatureSlide metar={metar} localWeather={localWeather} />
        ),
      },
      {
        id: "pressure",
        label: "Pressure",
        navLabel: "ALT",
        title: "Altimeter",
        content: <PressureSlide metar={metar} localWeather={localWeather} />,
      },
      {
        id: "local",
        label: "Local",
        navLabel: "LOCAL",
        title: "Local conditions",
        content: (
          <LocalWeatherSlide
            airportCode={airportCode}
            localWeather={localWeather}
            localWeatherError={localWeatherError}
            localWeatherLoading={localWeatherLoading}
          />
        ),
      },
    ].filter(Boolean);
  }, [
    airportCode,
    localWeather,
    localWeatherError,
    localWeatherLoading,
    metar,
    metarError,
    metarLoading,
    metarRaw,
  ]);

  const activeSlide = slides[activeIndex] || slides[0];

  const scrollToSlide = (index) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
    setActiveIndex(index);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setActiveIndex(Math.min(Math.max(next, 0), slides.length - 1));
  };

  return (
    <section className="weather-carousel-section px-6 pt-5 pb-5">
      <div className="weather-carousel-header flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          Weather
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-atc-dim">
          {activeSlide?.title || "—"}
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="weather-carousel-track mt-4 -mx-1 min-h-[180px]"
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            aria-hidden={activeIndex !== index}
            className="weather-carousel-slide px-1"
          >
            {slide.content}
          </article>
        ))}
      </div>

      <div
        role="tablist"
        aria-label="Weather views"
        className="weather-view-dots mt-4"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-label={slide.label}
            aria-selected={activeIndex === index}
            className={activeIndex === index ? "active" : ""}
            onClick={() => scrollToSlide(index)}
          >
            <span>{slide.navLabel || slide.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function getCeilingFeet(metar) {
  const layer = metar?.rawClouds?.find((item) =>
    ["BKN", "OVC", "VV"].includes(item.cover),
  );
  const number = Number(layer?.base);
  return Number.isFinite(number) ? number : null;
}
