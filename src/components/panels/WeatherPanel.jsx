"use client";

import { useWeatherCarouselNavigation } from "../../features/weather/useWeatherCarouselNavigation.js";
import { useWeatherSlides } from "../../features/weather/useWeatherSlides.jsx";
import { formatObsTime } from "../../features/weather/weatherModel.js";

export default function WeatherPanel({
  metar,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  airportLat = 0,
  airportLon = 0,
  airportCode = "",
}) {
  const slides = useWeatherSlides({
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
      <div className="panel-heading weather-carousel-heading">
        <div>
          <div className="panel-kicker">{activeSlide.eyebrow}</div>
          <h2>{activeSlide.title}</h2>
        </div>
        <span className="panel-pill">{formatObsTime(metar?.obsTime)}</span>
      </div>

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
        aria-label="Weather card view"
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
