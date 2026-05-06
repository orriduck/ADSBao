"use client";

import { useMemo } from "react";
import { WEATHER_SLIDE_COPY } from "../../config/weather.js";
import { useLocalWeather } from "../../hooks/useLocalWeather.js";
import {
  CeilingSlide,
  FlightRulesSlide,
  LocalWeatherSlide,
  MetarSlide,
  PressureSlide,
  TemperatureSlide,
  WindSlide,
} from "../../components/weather/WeatherSlides";
import { shouldShowCeilingSlide } from "./weatherModel.js";

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

  return useMemo(() => {
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
}
