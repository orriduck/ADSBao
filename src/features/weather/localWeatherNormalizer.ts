export function normalizeLocalWeather(payload) {
  const current = payload?.current;
  if (!current) return null;

  const base = {
    time: current.time || "",
    temperatureC: toFinite(current.temperature_2m),
    apparentTemperatureC: toFinite(current.apparent_temperature),
    humidity: toFinite(current.relative_humidity_2m),
    isDay: current.is_day === 1,
    precipitationIn: toFinite(current.precipitation),
    rainIn: toFinite(current.rain),
    showersIn: toFinite(current.showers),
    snowfallIn: toFinite(current.snowfall),
    weatherCode: toFinite(current.weather_code),
    cloudCover: toFinite(current.cloud_cover),
    pressureMslHpa: toFinite(current.pressure_msl),
    surfacePressureHpa: toFinite(current.surface_pressure),
    windSpeedKt: toFinite(current.wind_speed_10m),
    windDirection: toFinite(current.wind_direction_10m),
    windGustKt: toFinite(current.wind_gusts_10m),
    timezone: payload.timezone || "",
    source: "Open-Meteo",
  };

  // Slice the next 6 hourly timestamps (after any that are in the past)
  // so the forecast row always shows future hours relative to "now".
  const hours = normalizeHourlyForecast(payload);
  // Daily index 0 is today; index 1 is tomorrow.
  const tomorrow = normalizeDailyForecast(payload, 1);

  return { ...base, hourly: hours, tomorrow };
}

// Normalize the hourly array — return at most 6 entries for the UI.
export function normalizeHourlyForecast(payload) {
  const times = payload?.hourly?.time;
  if (!Array.isArray(times) || times.length === 0) return [];
  const temp = payload?.hourly?.temperature_2m ?? [];
  const code = payload?.hourly?.weather_code ?? [];
  const precip = payload?.hourly?.precipitation_probability ?? [];
  const tz = payload?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const now = new Date();
  let startIdx = 0;
  // Find the first hourly slot that starts <= 1 hour from now — we want
  // to include the current hour's slot even if the hour just started.
  for (let i = 0; i < times.length; i++) {
    const slotTime = new Date(times[i]);
    if (slotTime.getTime() + 3_600_000 >= now.getTime()) {
      startIdx = i;
      break;
    }
  }

  const results = [];
  for (let i = startIdx; i < times.length && results.length < 6; i++) {
    const slotTime = new Date(times[i]);
    results.push({
      time: new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      }).format(slotTime),
      temperatureC: toFinite(temp[i]),
      weatherCode: toFinite(code[i]),
      precipitationProbability: toFinite(precip[i]),
    });
  }
  return results;
}

// Normalize one day entry from the daily array (0 = today, 1 = tomorrow).
export function normalizeDailyForecast(payload, index = 1) {
  const times = payload?.daily?.time;
  if (!Array.isArray(times) || index >= times.length) return null;
  const tMax = payload?.daily?.temperature_2m_max;
  const tMin = payload?.daily?.temperature_2m_min;
  const code = payload?.daily?.weather_code;
  const precip = payload?.daily?.precipitation_probability_max;
  return {
    time: times[index] || "",
    temperatureMaxC: toFinite(tMax?.[index]),
    temperatureMinC: toFinite(tMin?.[index]),
    weatherCode: toFinite(code?.[index]),
    precipitationProbability: toFinite(precip?.[index]),
  };
}

const toFinite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
