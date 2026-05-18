"use client";

import { Cloud, Eye, Gauge, Moon, Sun } from "lucide-react";
import { FLIGHT_RULE_ORDER, FLIGHT_RULES } from "../../config/weather.js";
import {
  clamp,
  describeCeilingKey,
  describePressureKey,
  describeTemperatureKey,
  describeWindKey,
  getCeilingFeet,
  getMetarTokens,
  getWeatherConditionKey,
  round1,
  toNumber,
} from "../../features/weather/weatherModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export function MetarSlide({ metarRaw, metarLoading, metarError }) {
  const { t } = useI18n();
  const tokens = getMetarTokens(metarRaw);

  return (
    <div className="weather-slide-stack">
      <div className="metar-instrument">
        <div className="metar-token-strip" aria-hidden={!tokens.length}>
          {tokens.length
            ? tokens.map((item) => (
                <span key={item.labelKey}>
                  <small>{t(item.labelKey)}</small>
                  <strong className="font-mono">{item.value}</strong>
                </span>
              ))
            : null}
        </div>
        <div className="metar-code weather-metar-code">
          {metarRaw || (metarLoading ? t("weather.metarLoading") : t("weather.metarMissing"))}
        </div>
      </div>
      {metarError ? <div className="panel-error">{metarError}</div> : null}
    </div>
  );
}

export function FlightRulesSlide({ metar }) {
  const code = metar?.flightCategory || "VFR";
  const rules = FLIGHT_RULES[code] || FLIGHT_RULES.VFR;

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div className="flight-rule-banner">
          <span className="font-mono">{code}</span>
          <strong>{rules.label}</strong>
        </div>
        <div className="flight-rule-rail" aria-hidden="true">
          {FLIGHT_RULE_ORDER.map((item) => (
            <i
              key={item}
              className={item === code ? "active" : ""}
              style={{ "--rule-color": FLIGHT_RULES[item].color }}
            />
          ))}
        </div>
      </div>
      <WeatherDescription>{rules.context}</WeatherDescription>
    </div>
  );
}

export function CeilingSlide({ metar }) {
  const { t } = useI18n();
  const visibility = toNumber(metar?.rawVisib);
  const ceilingFt = getCeilingFeet(metar);
  const ceilingLabel = metar?.ceiling || (ceilingFt == null ? "CLR" : `${ceilingFt.toLocaleString()} ft`);

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div className="ceiling-readouts">
          <MetricLine
            icon={<Cloud size={15} />}
            label={t("weather.ceiling")}
            value={ceilingLabel}
          />
          <MetricLine
            icon={<Eye size={15} />}
            label={t("weather.visibility")}
            value={visibility == null ? "-" : `${visibility >= 10 ? "10+" : visibility} SM`}
          />
        </div>
      </div>
      <WeatherDescription>
        {t(describeCeilingKey(ceilingFt, visibility))}
      </WeatherDescription>
    </div>
  );
}

export function WindSlide({ metar, localWeather }) {
  const { t } = useI18n();
  const speed = toNumber(metar?.rawWspd) ?? localWeather?.windSpeedKt ?? 0;
  const gust = toNumber(metar?.rawWgst) ?? localWeather?.windGustKt ?? null;
  const direction = metar?.rawWvrb ? null : toNumber(metar?.rawWdir) ?? localWeather?.windDirection;

  return (
    <div className="weather-slide-stack wind-card">
      <div className="weather-slide-readout">
        <div className="wind-card__metrics">
          <div>
            <span>{t("weather.direction")}</span>
            <strong>
              {direction == null ? "VRB" : `${Math.round(direction)}°`}
            </strong>
          </div>
          <div>
            <span>{t("weather.wind")}</span>
            <strong>{Math.round(speed)} kt</strong>
          </div>
          <div>
            <span>{t("weather.gust")}</span>
            <strong>
              {gust == null ? t("weather.none") : `${Math.round(gust)} kt`}
            </strong>
          </div>
        </div>
      </div>
      <WeatherDescription>
        {direction == null
          ? t("weather.windPara.variable")
          : t(describeWindKey(speed, gust))}
      </WeatherDescription>
    </div>
  );
}

export function TemperatureSlide({ metar, localWeather }) {
  const { t } = useI18n();
  const temp = toNumber(metar?.rawTemp) ?? localWeather?.temperatureC;
  const dew = toNumber(metar?.rawDewp) ?? null;
  const spread = temp != null && dew != null ? Math.max(0, temp - dew) : null;
  const tempPct = temp == null ? null : clamp((temp + 20) / 60, 0.04, 0.96);
  const dewPct = dew == null ? null : clamp((dew + 20) / 60, 0.04, 0.96);

  return (
    <div className="weather-slide-stack">
      <div
        className="weather-slide-readout temp-card"
        style={{
          "--temp-pct": tempPct == null ? "50%" : `${tempPct * 100}%`,
          "--dew-pct": dewPct == null ? "50%" : `${dewPct * 100}%`,
        }}
      >
        <div className="temp-card__metrics">
          <div>
            <span>{t("weather.temp")}</span>
            <strong>{temp == null ? "-" : `${round1(temp)}°C`}</strong>
          </div>
          <div>
            <span>{t("weather.dew")}</span>
            <strong>{dew == null ? "-" : `${round1(dew)}°C`}</strong>
          </div>
          <div>
            <span>{t("weather.spread")}</span>
            <strong>{spread == null ? "-" : `${round1(spread)}°C`}</strong>
          </div>
        </div>
        <div className="temp-card__band-row" aria-hidden="true">
          <span className="temp-card__band-label">{t("weather.cold")}</span>
          <div className="temp-card__band">
            {tempPct != null ? (
              <i className="temp-card__band-marker temp-card__band-marker--temp" />
            ) : null}
            {dewPct != null ? (
              <i className="temp-card__band-marker temp-card__band-marker--dew" />
            ) : null}
          </div>
          <span className="temp-card__band-label">{t("weather.hot")}</span>
        </div>
      </div>
      <WeatherDescription>
        {t(describeTemperatureKey(temp, spread))}
      </WeatherDescription>
    </div>
  );
}

export function PressureSlide({ metar, localWeather }) {
  const { t } = useI18n();
  const altim = metar?.rawAltim;
  const pressure = localWeather?.pressureMslHpa;

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div className="pressure-strip">
          <MetricLine
            icon={<Gauge size={16} />}
            label={t("weather.altimeter")}
            value={metar?.altim || "-"}
          />
          <MetricLine
            label={t("weather.mslPressure")}
            value={pressure == null ? "-" : `${Math.round(pressure)} hPa`}
          />
        </div>
      </div>
      <WeatherDescription>
        {t(describePressureKey(altim, pressure))}
      </WeatherDescription>
    </div>
  );
}

export function LocalWeatherSlide({
  airportCode,
  localWeather,
  localWeatherError,
  localWeatherLoading,
}) {
  const { t } = useI18n();
  const condition = localWeather
    ? t(getWeatherConditionKey(localWeather.weatherCode))
    : t("weather.pending");
  const humidity = localWeather?.humidity;
  const feelsLike = localWeather?.apparentTemperatureC;

  return (
    <div className="weather-visual-layout">
      <div className="local-weather-row">
        <div className="local-weather-glyph">
          {localWeather?.isDay ? <Sun size={42} /> : <Moon size={42} />}
        </div>
        <div className="weather-slide-stack">
          <MetricLine
            label={t("weather.airportLocal", {
              airport: airportCode || t("weather.airportFallback"),
            })}
            value={
              localWeather?.temperatureC == null
                ? localWeatherLoading
                  ? t("weather.loading")
                  : "-"
                : `${round1(localWeather.temperatureC)}°C`
            }
          />
          <p className="weather-context-copy">
            {localWeatherError
              ? t("weather.openMeteoError", { error: localWeatherError })
              : condition}
          </p>
          <div className="local-weather-meta">
            <span>{t("weather.humidity")} <span className="font-mono">{humidity == null ? "-" : `${Math.round(humidity)}%`}</span></span>
            <span>
              {t("weather.feels")} <span className="font-mono">{feelsLike == null ? "-" : `${round1(feelsLike)}°C`}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherDescription({ children }) {
  return <p className="weather-context-copy weather-slide-description">{children}</p>;
}

function MetricLine({ label, value, icon = null }) {
  return (
    <div className="weather-metric-line">
      <span>
        {icon}
        {label}
      </span>
      <strong className="font-mono">{value}</strong>
    </div>
  );
}
