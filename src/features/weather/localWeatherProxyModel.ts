const OPEN_METEO_CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
].join(",");

// `visibility` is an hourly-only Open-Meteo variable (meters); the current
// reading is taken from the current hour in the normalizer.
const OPEN_METEO_HOURLY_VARIABLES = [
  "temperature_2m",
  "weather_code",
  "precipitation_probability",
  "visibility",
].join(",");

const OPEN_METEO_DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "weather_code",
  "precipitation_probability_max",
].join(",");

function normalizeCoordinateParam(value) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export function normalizeLatitudeParam(value) {
  const coordinate = normalizeCoordinateParam(value);
  return coordinate != null && coordinate >= -90 && coordinate <= 90
    ? coordinate
    : null;
}

export function normalizeLongitudeParam(value) {
  const coordinate = normalizeCoordinateParam(value);
  return coordinate != null && coordinate >= -180 && coordinate <= 180
    ? coordinate
    : null;
}

export function isValidOpenMeteoCurrentPayload(payload) {
  return Boolean(payload && typeof payload === "object" && payload.current);
}

export function buildOpenMeteoCurrentWeatherUrl({ latitude, longitude }) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", OPEN_METEO_CURRENT_VARIABLES);
  url.searchParams.set("hourly", OPEN_METEO_HOURLY_VARIABLES);
  url.searchParams.set("daily", OPEN_METEO_DAILY_VARIABLES);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "2");
  return url;
}
