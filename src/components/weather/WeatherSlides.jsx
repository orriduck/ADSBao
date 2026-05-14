"use client";

import { Cloud, Eye, Gauge, Moon, Sun } from "lucide-react";
import { FLIGHT_RULE_ORDER, FLIGHT_RULES } from "../../config/weather.js";
import {
  clamp,
  describeCeiling,
  describePressure,
  describeTemperature,
  describeWind,
  getCeilingFeet,
  getMetarTokens,
  getWeatherConditionLabel,
  round1,
  toNumber,
} from "../../features/weather/weatherModel.js";

export function MetarSlide({ metarRaw, metarLoading, metarError }) {
  const tokens = getMetarTokens(metarRaw);

  return (
    <div className="weather-slide-stack">
      <div className="metar-instrument">
        <div className="metar-token-strip" aria-hidden={!tokens.length}>
          {tokens.length
            ? tokens.map((item) => (
                <span key={item.label}>
                  <small>{item.label}</small>
                  <strong className="font-mono">{item.value}</strong>
                </span>
              ))
            : null}
        </div>
        <div className="metar-code weather-metar-code">
          {metarRaw || (metarLoading ? "Loading METAR..." : "No METAR available.")}
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
  const visibility = toNumber(metar?.rawVisib);
  const ceilingFt = getCeilingFeet(metar);
  const ceilingLabel = metar?.ceiling || (ceilingFt == null ? "CLR" : `${ceilingFt.toLocaleString()} ft`);

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div className="ceiling-readouts">
          <MetricLine
            icon={<Cloud size={15} />}
            label="Ceiling"
            value={ceilingLabel}
          />
          <MetricLine
            icon={<Eye size={15} />}
            label="Visibility"
            value={visibility == null ? "-" : `${visibility >= 10 ? "10+" : visibility} SM`}
          />
        </div>
      </div>
      <WeatherDescription>{describeCeiling(ceilingFt, visibility)}</WeatherDescription>
    </div>
  );
}

export function WindSlide({ metar, localWeather }) {
  const speed = toNumber(metar?.rawWspd) ?? localWeather?.windSpeedKt ?? 0;
  const gust = toNumber(metar?.rawWgst) ?? localWeather?.windGustKt ?? null;
  const direction = metar?.rawWvrb ? null : toNumber(metar?.rawWdir) ?? localWeather?.windDirection;

  return (
    <div className="weather-slide-stack wind-card">
      <div className="weather-slide-readout">
        <div className="wind-card__metrics">
          <div>
            <span>Direction</span>
            <strong>
              {direction == null ? "VRB" : `${Math.round(direction)}°`}
            </strong>
          </div>
          <div>
            <span>Wind</span>
            <strong>{Math.round(speed)} kt</strong>
          </div>
          <div>
            <span>Gust</span>
            <strong>
              {gust == null ? "None" : `${Math.round(gust)} kt`}
            </strong>
          </div>
        </div>
      </div>
      <WeatherDescription>
        {direction == null
          ? "Variable wind makes runway planning less predictable. Tower may switch flows or issue runway-specific guidance."
          : describeWind(speed, gust)}
      </WeatherDescription>
    </div>
  );
}

export function TemperatureSlide({ metar, localWeather }) {
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
            <span>Temp</span>
            <strong>{temp == null ? "-" : `${round1(temp)}°C`}</strong>
          </div>
          <div>
            <span>Dew</span>
            <strong>{dew == null ? "-" : `${round1(dew)}°C`}</strong>
          </div>
          <div>
            <span>Spread</span>
            <strong>{spread == null ? "-" : `${round1(spread)}°C`}</strong>
          </div>
        </div>
        <div className="temp-card__band-row" aria-hidden="true">
          <span className="temp-card__band-label">cold</span>
          <div className="temp-card__band">
            {tempPct != null ? (
              <i className="temp-card__band-marker temp-card__band-marker--temp" />
            ) : null}
            {dewPct != null ? (
              <i className="temp-card__band-marker temp-card__band-marker--dew" />
            ) : null}
          </div>
          <span className="temp-card__band-label">hot</span>
        </div>
      </div>
      <WeatherDescription>{describeTemperature(temp, spread)}</WeatherDescription>
    </div>
  );
}

export function PressureSlide({ metar, localWeather }) {
  const altim = metar?.rawAltim;
  const pressure = localWeather?.pressureMslHpa;

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div className="pressure-strip">
          <MetricLine
            icon={<Gauge size={16} />}
            label="Altimeter"
            value={metar?.altim || "-"}
          />
          <MetricLine
            label="MSL pressure"
            value={pressure == null ? "-" : `${Math.round(pressure)} hPa`}
          />
        </div>
      </div>
      <WeatherDescription>{describePressure(altim, pressure)}</WeatherDescription>
    </div>
  );
}

export function LocalWeatherSlide({
  airportCode,
  localWeather,
  localWeatherError,
  localWeatherLoading,
}) {
  const condition = localWeather
    ? getWeatherConditionLabel(localWeather.weatherCode)
    : "Local weather pending";
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
            label={`${airportCode || "Airport"} local`}
            value={
              localWeather?.temperatureC == null
                ? localWeatherLoading
                  ? "Loading..."
                  : "-"
                : `${round1(localWeather.temperatureC)}°C`
            }
          />
          <p className="weather-context-copy">
            {localWeatherError
              ? `Open-Meteo unavailable: ${localWeatherError}`
              : condition}
          </p>
          <div className="local-weather-meta">
            <span>Humidity <span className="font-mono">{humidity == null ? "-" : `${Math.round(humidity)}%`}</span></span>
            <span>
              Feels <span className="font-mono">{feelsLike == null ? "-" : `${round1(feelsLike)}°C`}</span>
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
