"use client";

import { useWeatherCarouselNavigation } from "../../features/weather/useWeatherCarouselNavigation.js";
import { useWeatherSlides } from "../../features/weather/useWeatherSlides.jsx";

export default function WeatherCarousel({
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  airportCode = "",
  airportLat = 0,
  airportLon = 0,
}) {
  const slides = useWeatherSlides({
    variant: "carousel",
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
    <section className="weather-carousel-section px-6 pt-4 pb-4">
      <div className="weather-carousel-header flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-atc-faint">
          Weather
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-atc-dim">
          {activeSlide?.title || "—"}
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="weather-carousel-track mt-3 -mx-1 min-h-[148px]"
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
          />
        ))}
      </div>
    </section>
  );
}
