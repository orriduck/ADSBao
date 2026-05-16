"use client";

import { useMemo } from "react";
import { WEATHER_SLIDE_COPY } from "@/config/weather.js";
import { useLocalWeather } from "@/hooks/useLocalWeather.js";
import {
  CeilingSlide,
  FlightRulesSlide,
  LocalWeatherSlide,
  MetarSlide,
  PressureSlide,
  TemperatureSlide,
  WindSlide,
} from "./WeatherSlides.jsx";
import { shouldShowCeilingSlide, toNumber } from "@/features/weather/weatherModel.js";

export function useWeatherSlides({
  variant,
  metar,
  metarRaw,
  metarLoading,
  metarError,
  airportCode,
  airportLat,
  airportLon,
}) {
  const {
    weather: localWeather,
    loading: localWeatherLoading,
    error: localWeatherError,
  } = useLocalWeather(airportLat, airportLon);

  // Arrows rotate by the same bearing shown in the "Direction" readout so
  // the visual matches the number on the card (190° on the label = arrows
  // tilted to 190° on screen). This is the "wind FROM" bearing in METAR
  // convention; we don't flip 180° into the "flow" direction because the
  // mismatch with the displayed number is confusing.
  const windFlowBearing = useMemo(() => {
    if (metar?.rawWvrb) return null;
    const direction =
      toNumber(metar?.rawWdir) ?? localWeather?.windDirection ?? null;
    if (direction == null) return null;
    return Number(direction) % 360;
  }, [metar, localWeather]);

  const slides = useMemo(() => {
    const copy = WEATHER_SLIDE_COPY[variant];
    const withContent = (id, content) => ({
      id,
      ...copy[id],
      content,
    });

    return [
      withContent(
        "metar",
        <MetarSlide
          metarRaw={metarRaw}
          metarLoading={metarLoading}
          metarError={metarError}
        />,
      ),
      withContent("rules", <FlightRulesSlide metar={metar} />),
      shouldShowCeilingSlide(metar)
        ? withContent("ceiling", <CeilingSlide metar={metar} />)
        : null,
      withContent(
        "wind",
        <WindSlide metar={metar} localWeather={localWeather} />,
      ),
      withContent(
        "temp",
        <TemperatureSlide metar={metar} localWeather={localWeather} />,
      ),
      withContent(
        "pressure",
        <PressureSlide metar={metar} localWeather={localWeather} />,
      ),
      withContent(
        "local",
        <LocalWeatherSlide
          airportCode={airportCode}
          localWeather={localWeather}
          localWeatherError={localWeatherError}
          localWeatherLoading={localWeatherLoading}
        />,
      ),
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
    variant,
  ]);

  return { slides, windFlowBearing };
}
