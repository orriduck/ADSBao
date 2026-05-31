"use client";

import { useMemo } from "react";
import { useLocalWeather } from "@/hooks/useLocalWeather";
import {
  CeilingSlide,
  FlightRulesSlide,
  LocalWeatherSlide,
  MetarSlide,
  PressureSlide,
  TemperatureSlide,
  WindSlide,
} from "./WeatherSlides";
import { shouldShowCeilingSlide, toNumber } from "@/features/weather/weatherModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const SLIDE_COPY_FIELDS = {
  panel: ["label", "title", "eyebrow"],
  carousel: ["label", "navLabel", "title"],
};

const buildSlideCopy = (t, variant, id) => {
  const fields = SLIDE_COPY_FIELDS[variant] || SLIDE_COPY_FIELDS.carousel;
  return fields.reduce((acc, field) => {
    acc[field] = t(`weatherCopy.${variant}.${id}.${field}`);
    return acc;
  }, {});
};

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

  const { t } = useI18n();

  const slides = useMemo(() => {
    const withContent = (id, content) => ({
      id,
      ...buildSlideCopy(t, variant, id),
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
    t,
    variant,
  ]);

  return { slides, windFlowBearing };
}
