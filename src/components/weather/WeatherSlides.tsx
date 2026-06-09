"use client";

import { useState } from "react";
import { Cloud, Droplets, Eye, Gauge, Moon, Sun, Thermometer } from "lucide-react";
import { FLIGHT_RULE_ORDER, FLIGHT_RULES } from "../../config/weather";
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
} from "../../features/weather/weatherModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  altitudeUnitLabel,
  convertAltitudeFromFt,
  convertTemperatureFromC,
  temperatureUnitLabel,
} from "@/utils/units";
import AsyncStatusLine from "@/components/ui/AsyncStatusLine";

function formatTemperatureValue(celsius, unit) {
  if (celsius == null || !Number.isFinite(Number(celsius))) return "-";
  const converted = convertTemperatureFromC(Number(celsius), unit);
  return `${round1(converted)}${temperatureUnitLabel(unit)}`;
}

function formatGroundAltitudeFeet(ft, unit) {
  if (ft == null || !Number.isFinite(Number(ft))) return null;
  // Ceilings / elevations don't use FL — fall back to ft if user picked FL.
  const targetUnit = unit === "fl" ? "ft" : unit;
  const converted = convertAltitudeFromFt(Number(ft), targetUnit);
  return `${Math.round(converted).toLocaleString()} ${altitudeUnitLabel(targetUnit)}`;
}

export function MetarSlide({
  metarRaw,
  metarLoading,
  metarError,
  metarStatusCode = null,
  metarStation = "",
}) {
  const { t } = useI18n();
  const tokens = getMetarTokens(metarRaw);
  const placeholder = metarLoading
    ? t("weather.metarLoading")
    : t("weather.metarMissing");

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
        <section
          className={`metar-raw ${metarRaw ? "" : "metar-raw--placeholder"}`}
        >
          <span className="metar-raw__label">
            {t("weather.metarFullReport")}
          </span>
          <code className="metar-raw__code notranslate" translate="no">
            {metarRaw || placeholder}
          </code>
        </section>
        <AsyncStatusLine
          loading={Boolean(metarLoading)}
          error={metarError || null}
          statusCode={metarStatusCode}
          cycleKey={metarStation || metarRaw || "metar"}
          pendingLabel={t("weather.metarLoading")}
          successLabel={t("weather.metarLoaded")}
          errorLabel={t("weather.metarLoadError")}
          className="mt-1 self-end"
        />
      </div>
    </div>
  );
}

export function FlightRulesSlide({ metar, metarLoading = false }) {
  const { t } = useI18n();
  // When METAR is still loading or unavailable, don't default to VFR —
  // that looks like meaningful data when it isn't. Show a pending or
  // unavailable state instead.
  const isMissing = !metar;
  const code = isMissing ? null : (metar?.flightCategory || null);
  const rules = code ? (FLIGHT_RULES[code] || null) : null;
  const label = rules?.labelKey ? t(rules.labelKey) : rules?.label || (metarLoading ? t("weather.metarLoading") : t("weather.metarMissing"));
  const context = rules?.contextKey ? t(rules.contextKey) : rules?.context || "";

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div className="flight-rule-banner">
          <span className="font-mono">{code || (metarLoading ? "···" : "—")}</span>
          <strong>{label}</strong>
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
      <WeatherDescription>{context}</WeatherDescription>
    </div>
  );
}

export function CeilingSlide({ metar }) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const visibility = toNumber(metar?.rawVisib);
  const ceilingFt = getCeilingFeet(metar);
  const ceilingLabel =
    metar?.ceiling ||
    (ceilingFt == null
      ? "CLR"
      : formatGroundAltitudeFeet(ceilingFt, units.altitude) ?? `${ceilingFt}`);

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
  // Prefer METAR values; fall back to local weather only when
  // METAR is present but sparse (unlikely). When metar itself
  // is missing, keep everything null — 0 kt looks like real
  // weather when it isn't.
  const hasMetar = Boolean(metar);
  const speed = hasMetar
    ? (toNumber(metar?.rawWspd) ?? localWeather?.windSpeedKt ?? null)
    : null;
  const gust = hasMetar
    ? (toNumber(metar?.rawWgst) ?? localWeather?.windGustKt ?? null)
    : null;
  const direction = hasMetar
    ? (metar?.rawWvrb ? null : toNumber(metar?.rawWdir) ?? localWeather?.windDirection ?? null)
    : null;

  return (
    <div className="weather-slide-stack wind-card">
      <div className="weather-slide-readout">
        <div className="weather-token-strip weather-token-strip--cols-3">
          <WeatherToken
            label={t("weather.direction")}
            value={direction == null ? "VRB" : `${Math.round(direction)}°`}
          />
          <WeatherToken
            label={t("weather.wind")}
            value={speed == null ? "—" : `${Math.round(speed)} kt`}
          />
          <WeatherToken
            label={t("weather.gust")}
            value={gust == null ? t("weather.none") : `${Math.round(gust)} kt`}
          />
        </div>
      </div>
      <WeatherDescription>
        {speed == null
          ? t("weather.windPara.unavailable")
          : direction == null
          ? t("weather.windPara.variable")
          : t(describeWindKey(speed, gust))}
      </WeatherDescription>
    </div>
  );
}

export function TemperatureSlide({ metar, localWeather }) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
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
        <div className="weather-token-strip weather-token-strip--cols-3">
          <WeatherToken
            label={t("weather.temp")}
            value={formatTemperatureValue(temp, units.temperature)}
          />
          <WeatherToken
            label={t("weather.dew")}
            value={formatTemperatureValue(dew, units.temperature)}
          />
          <WeatherToken
            label={t("weather.spread")}
            value={
              spread == null
                ? "-"
                : `${round1(units.temperature === "f" ? spread * 1.8 : spread)}${temperatureUnitLabel(units.temperature)}`
            }
          />
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
  localWeatherStatusCode = null,
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const condition = localWeather
    ? t(getWeatherConditionKey(localWeather.weatherCode))
    : t("weather.pending");
  const humidity = localWeather?.humidity;
  const feelsLike = localWeather?.apparentTemperatureC;
  const airportLabel = t("weather.airportLocal", {
    airport: airportCode || t("weather.airportFallback"),
  });
  const tempValue =
    localWeather?.temperatureC == null
      ? localWeatherLoading
        ? t("weather.loading")
        : "-"
      : formatTemperatureValue(localWeather.temperatureC, units.temperature);

  return (
    <div className="weather-visual-layout">
      <div className="local-weather-row">
        <div className="local-weather-glyph">
          {localWeather?.isDay ? <Sun size={42} /> : <Moon size={42} />}
        </div>
        <div className="weather-slide-stack local-weather-content">
          <WeatherToken label={airportLabel} value={tempValue} />
          <p className="weather-context-copy">
            {localWeatherError
              ? t("weather.openMeteoError", { error: localWeatherError })
              : condition}
          </p>
          <div className="weather-token-strip weather-token-strip--cols-2 local-weather-meta">
            <WeatherToken
              label={t("weather.humidity")}
              value={humidity == null ? "-" : `${Math.round(humidity)}%`}
              valueClassName="weather-token__value--secondary"
            />
            <WeatherToken
              label={t("weather.feels")}
              value={formatTemperatureValue(feelsLike, units.temperature)}
              valueClassName="weather-token__value--secondary"
            />
          </div>
          <AsyncStatusLine
            loading={Boolean(localWeatherLoading)}
            error={localWeatherError || null}
            statusCode={localWeatherStatusCode}
            cycleKey={airportCode || "local-weather"}
            pendingLabel={t("weather.loading")}
            successLabel={t("weather.loaded")}
            errorLabel={t("weather.loadError")}
            className="self-end"
          />
        </div>
      </div>
    </div>
  );
}

function WeatherDescription({ children }) {
  return <p className="weather-context-copy weather-slide-description">{children}</p>;
}

// Shared weather-instrument token: small mono label on top, big mono value
// below. Lives across every weather card so the briefing stack reads as one
// coherent instrument family — the same pattern the METAR token strip uses.
function WeatherToken({ label, value, valueClassName = "" }) {
  return (
    <div className="weather-token">
      <span className="weather-token__label">{label}</span>
      <strong
        className={`weather-token__value notranslate ${valueClassName}`.trim()}
        translate="no"
      >
        {value}
      </strong>
    </div>
  );
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

// ―――――――――――――――――――――――――――――――――――――――――――――――――――
// Hourly forecast + next-day local weather
// ―――――――――――――――――――――――――――――――――――――――――――――――――――

// Compact weather code → short i18n label so each hourly cell reads
// as a terse icon-ish word (e.g. "晴" / "Clear") without a full sentence.
function shortWeatherLabel(code, t) {
  if (code == null) return "";
  // Codes disambiguated for the narrow hourly column — keep it at
  // most 3-4 characters wide in English, 1-2 in Chinese.
  const compact = {
    0: "weather.forecast.clear",
    1: "weather.forecast.mainlyClear",
    2: "weather.forecast.partlyCloudy",
    3: "weather.forecast.overcast",
    45: "weather.forecast.fog",
    48: "weather.forecast.fog",
    51: "weather.forecast.drizzle",
    53: "weather.forecast.drizzle",
    55: "weather.forecast.drizzle",
    61: "weather.forecast.rain",
    63: "weather.forecast.rain",
    65: "weather.forecast.heavyRain",
    71: "weather.forecast.snow",
    73: "weather.forecast.snow",
    75: "weather.forecast.heavySnow",
    80: "weather.forecast.showers",
    81: "weather.forecast.showers",
    82: "weather.forecast.showers",
    95: "weather.forecast.thunderstorm",
  };
  const key = compact[code];
  return key ? t(key) : "";
}

function hourlyTemp(val, unit) {
  if (val == null || !Number.isFinite(Number(val))) return "—";
  return `${Math.round(convertTemperatureFromC(Number(val), unit))}°`;
}

export function HourlyForecastSlide({ localWeather }) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const hours = localWeather?.hourly ?? [];
  const tomorrow = localWeather?.tomorrow ?? null;
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="weather-visual-layout">
      {/* 6-hour grid — 3 columns × 2 rows, each cell is a card */}
      {hours.length > 0 ? (
        <div className="hourly-grid">
          {hours.map((h, i) => {
            const isActive = activeIdx === i;
            return (
              <button
                key={i}
                type="button"
                data-active={isActive ? "true" : undefined}
                className="hourly-card group"
                onClick={() => setActiveIdx(isActive ? null : i)}
              >
                <span className="hourly-card__time">{h.time}</span>
                <span className="hourly-card__temp notranslate" translate="no">
                  {hourlyTemp(h.temperatureC, units.temperature)}
                </span>
                <span className="hourly-card__condition notranslate" translate="no">
                  {shortWeatherLabel(h.weatherCode, t) || "—"}
                </span>
                {h.precipitationProbability != null &&
                  h.precipitationProbability > 0 ? (
                  <span className="hourly-card__precip">
                    <Droplets size={10} aria-hidden="true" />
                    {Math.round(h.precipitationProbability)}%
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Tomorrow summary */}
      {tomorrow ? (
        <div className="forecast-tomorrow">
          <div className="forecast-tomorrow__label">
            {t("weather.forecast.tomorrow")}
          </div>
          <div className="forecast-tomorrow__card">
            <div className="forecast-tomorrow__date notranslate" translate="no">
              {(() => {
                try {
                  return new Intl.DateTimeFormat("en", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(tomorrow.time + "T12:00"));
                } catch {
                  return "";
                }
              })()}
            </div>
            <div className="forecast-tomorrow__condition">
              {t(`weather.code.${tomorrow.weatherCode ?? "unknown"}`)}
            </div>
            <div className="forecast-tomorrow__temps notranslate" translate="no">
              <Thermometer size={13} aria-hidden="true" />
              {hourlyTemp(tomorrow.temperatureMaxC, units.temperature)}
              <span className="forecast-tomorrow__sep">/</span>
              <span className="forecast-tomorrow__lo">
                {hourlyTemp(tomorrow.temperatureMinC, units.temperature)}
              </span>
            </div>
            {tomorrow.precipitationProbability != null &&
              tomorrow.precipitationProbability > 0 ? (
              <div className="forecast-tomorrow__precip">
                <Droplets size={11} aria-hidden="true" />
                {Math.round(tomorrow.precipitationProbability)}%
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
