"use client";

import { useMemo } from "react";
import { useLocalWeather } from "@/hooks/useLocalWeather";
import {
  CeilingSlide,
  FlightRulesSlide,
  HourlyForecastSlide,
  LocalWeatherSlide,
  MetarSlide,
  PressureSlide,
  TemperatureSlide,
  WindSlide,
} from "./WeatherSlides";
import { toNumber } from "@/features/weather/weatherModel";
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
  metarStatusCode = null,
  airportCode,
  airportLat,
  airportLon,
  nearMe = false,
}) {
  const {
    weather: localWeather,
    loading: localWeatherLoading,
    error: localWeatherError,
    statusCode: localWeatherStatusCode,
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
      // Near-me mode: only the hourly forecast grid (which already
      // contains the tomorrow card below it). No METAR, no flight
      // rules, no ceiling/wind/temp/pressure — those all depend on
      // an airport METAR which doesn't exist for the user's location.
      ...(nearMe
        ? []
        : [
            withContent(
              "metar",
              <MetarSlide
                metarRaw={metarRaw}
                metarLoading={metarLoading}
                metarError={metarError}
                metarStatusCode={metarStatusCode}
                metarStation={airportCode}
              />,
            ),
            withContent("rules", <FlightRulesSlide metar={metar} metarLoading={metarLoading} />),
            withContent("ceiling", <CeilingSlide metar={metar} metarLoading={metarLoading} />),
            withContent(
              "wind",
              <WindSlide metar={metar} localWeather={localWeather} metarLoading={metarLoading} />,
            ),
            withContent(
              "temp",
              <TemperatureSlide metar={metar} localWeather={localWeather} metarLoading={metarLoading} />,
            ),
            withContent(
              "pressure",
              <PressureSlide metar={metar} localWeather={localWeather} metarLoading={metarLoading} />,
            ),
            withContent(
              "local",
              <LocalWeatherSlide
                airportCode={airportCode}
                localWeather={localWeather}
                localWeatherError={localWeatherError}
                localWeatherLoading={localWeatherLoading}
                localWeatherStatusCode={localWeatherStatusCode}
              />,
            ),
          ]),
      withContent(
        "hourly",
        <HourlyForecastSlide localWeather={localWeather} />,
      ),
    ].filter(Boolean);
  }, [
    airportCode,
    localWeather,
    localWeatherError,
    localWeatherLoading,
    localWeatherStatusCode,
    metar,
    metarError,
    metarLoading,
    metarRaw,
    metarStatusCode,
    t,
    variant,
  ]);

  return { slides, windFlowBearing };
}
