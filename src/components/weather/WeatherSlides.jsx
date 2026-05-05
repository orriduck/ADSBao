"use client";

import {
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Navigation,
  Moon,
  Sun,
  Thermometer,
} from "lucide-react";

const FLIGHT_RULES = {
  VFR: {
    label: "Visual Flight Rules",
    color: "var(--atc-text)",
    context:
      "Skies and visibility support normal visual operations. Weather is unlikely to constrain airport capacity.",
  },
  MVFR: {
    label: "Marginal Visual Flight Rules",
    color: "var(--atc-dim)",
    context:
      "Visibility or ceiling is reduced. Arrivals and departures usually continue, but pilots watch weather margins closely.",
  },
  IFR: {
    label: "Instrument Flight Rules",
    color: "var(--atc-faint)",
    context:
      "Low clouds or limited visibility require instrument procedures. Arrival spacing can increase and delays become more likely.",
  },
  LIFR: {
    label: "Low IFR",
    color: "var(--atc-line-strong)",
    context:
      "Very low ceiling or visibility limits airport flow. Only aircraft and runways equipped for low-visibility operations can land reliably.",
  },
};

const WEATHER_CODES = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

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
          {["VFR", "MVFR", "IFR", "LIFR"].map((item) => (
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
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <WindVector speed={speed} gust={gust} direction={direction} />
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
  const tempPct = temp == null ? 0.5 : clamp((temp + 20) / 60, 0.04, 0.96);
  const dewPct = dew == null ? null : clamp((dew + 20) / 60, 0.04, 0.96);

  return (
    <div className="weather-slide-stack">
      <div className="weather-slide-readout">
        <div
          className="thermal-band"
          style={{
            "--temp-pct": `${tempPct * 100}%`,
            "--dew-pct": `${(dewPct ?? tempPct) * 100}%`,
          }}
          aria-hidden="true"
        >
          <span>cold</span>
          <i>
            <b />
          </i>
          <span>hot</span>
        </div>
        <div className="temperature-strip">
          <MetricLine
            label="Temperature"
            value={temp == null ? "-" : `${round1(temp)}°C`}
            icon={<Thermometer size={16} />}
          />
          <MetricLine
            label="Dew point"
            value={dew == null ? "-" : `${round1(dew)}°C`}
            icon={<Droplets size={16} />}
          />
          <MetricLine
            label="Spread"
            value={spread == null ? "-" : `${round1(spread)}°C`}
          />
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
    ? WEATHER_CODES[localWeather.weatherCode] || "Current conditions"
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

function WindVector({ speed, gust, direction }) {
  return (
    <div className="wind-vector-card">
      <div
        className="wind-compass"
        style={{ "--wind-bearing": `${direction ?? 0}deg` }}
        aria-label={direction == null ? "Variable wind" : `Wind from ${Math.round(direction)} degrees`}
      >
        <span>N</span>
        <span>E</span>
        <span>S</span>
        <span>W</span>
        <i>
          <Navigation size={20} fill="currentColor" />
        </i>
      </div>
      <div>
        <span>Direction</span>
        <strong className="font-mono">{direction == null ? "VRB" : `${Math.round(direction)}°`}</strong>
      </div>
      <div>
        <span>Wind</span>
        <strong className="font-mono">{Math.round(speed)} kt</strong>
      </div>
      <div>
        <span>Gust</span>
        <strong className="font-mono">{gust == null ? "None" : `${Math.round(gust)} kt`}</strong>
      </div>
    </div>
  );
}

function WeatherDescription({ children }) {
  return <p className="weather-context-copy weather-slide-description">{children}</p>;
}

function describeWind(speed, gust) {
  const effective = Math.max(speed ?? 0, gust ?? 0);
  if (effective >= 30) {
    return "Strong winds or gusts can reduce arrival rates, increase go-around risk, and force stricter runway selection.";
  }
  if (effective >= 15) {
    return "Moderate wind is workable, but crosswind components and gust spread can affect spacing and runway configuration.";
  }
  return "Light wind usually gives the airport more runway flexibility and keeps arrival and departure flow stable.";
}

function describeTemperature(temp, spread) {
  if (spread != null && spread < 3) {
    return "A small temperature-dewpoint spread can support fog, haze, or low cloud development near the field.";
  }
  if (temp != null && temp >= 32) {
    return "Hot air reduces aircraft performance, which can lengthen takeoff rolls and affect climb margins.";
  }
  if (temp != null && temp <= 0) {
    return "Cold conditions can improve density altitude, but icing, braking action, and deicing become operational concerns.";
  }
  return "Temperature and dewpoint are separated enough that fog risk is lower near the field.";
}

function describePressure(altim, pressure) {
  const hpa = pressure ?? (altim != null ? altim * 33.8639 : null);
  if (hpa == null) {
    return "Pressure data helps crews set altimeters and judge density-altitude effects around the airport.";
  }
  if (hpa < 1000) {
    return "Lower pressure increases density altitude and can come with unsettled weather, reducing performance margins.";
  }
  if (hpa > 1020) {
    return "Higher pressure generally improves aircraft performance and often accompanies more stable weather.";
  }
  return "Pressure is near standard range, so altimeter setting is important but not a major performance driver.";
}

function describeCeiling(ceilingFt, visibility) {
  if (ceilingFt == null && visibility == null) {
    return "No limiting ceiling or visibility value is available in the current METAR.";
  }
  if (ceilingFt != null && ceilingFt < 1000) {
    return "Low ceiling can push arrivals toward instrument procedures and reduce visual runway flexibility.";
  }
  if (visibility != null && visibility < 3) {
    return "Reduced visibility can increase spacing and make surface movement more dependent on tower guidance.";
  }
  return "Ceiling and visibility are comfortably above the usual VFR thresholds for airport operations.";
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

function getMetarTokens(raw) {
  const parts = String(raw || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return [];
  const reportPrefix = /^(METAR|SPECI)$/i.test(parts[0]);
  const station = reportPrefix ? parts[1] : parts[0];
  const issued = reportPrefix ? parts[2] : parts[1];

  const wind = parts.find((item) => /^(VRB|\d{3})\d{2,3}(G\d{2,3})?KT$/.test(item));
  const visibility = parts.find((item) => /^(\d{1,2}|\d{1,2}SM|P\d{1,2}SM|\d\/\dSM)$/.test(item));

  return [
    { label: "Station", value: station || "-" },
    { label: "Issued", value: issued || "-" },
    { label: "Wind", value: wind || "-" },
    { label: "Vis", value: visibility || "-" },
  ];
}

function getCeilingFeet(metar) {
  const layer = metar?.rawClouds?.find((item) =>
    ["BKN", "OVC", "VV"].includes(item.cover),
  );
  return toNumber(layer?.base);
}

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const round1 = (value) => Number(value).toFixed(1);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
