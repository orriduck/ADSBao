"use client";

import { useWeatherCarouselNavigation } from "../../features/weather/useWeatherCarouselNavigation.js";
import { useWeatherSlides } from "@/components/weather/useWeatherSlides.jsx";
import { formatObsTime } from "../../features/weather/weatherModel.js";
import PanelHeading from "./PanelHeading.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function WeatherPanel({
  metar,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  airportLat = 0,
  airportLon = 0,
  airportCode = "",
}) {
  const { t } = useI18n();
  const { slides } = useWeatherSlides({
    variant: "panel",
    metar,
    metarRaw,
    metarLoading,
    metarError,
    airportCode,
    airportLat,
    airportLon,
  });
  const {
    activeIndex,
    activeSlide,
    trackRef,
    scrollToSlide,
    handleScroll,
  } = useWeatherCarouselNavigation(slides);

  return (
    <section className="glass-panel weather-instrument-panel weather-carousel-panel">
      <PanelHeading
        kicker={activeSlide.eyebrow}
        title={activeSlide.title}
        pill={formatObsTime(metar?.obsTime)}
        className="weather-carousel-heading"
      />

      <div
        ref={trackRef}
        className="weather-carousel-track"
        onScroll={handleScroll}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            aria-hidden={activeIndex !== index}
            className="weather-carousel-slide"
          >
            {slide.content}
          </article>
        ))}
      </div>

      <div
        className="weather-view-dots weather-carousel-dots"
        role="tablist"
        aria-label={t("weather.cardViewAria")}
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
          />
        ))}
      </div>
    </section>
  );
}
