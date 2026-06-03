import assert from "node:assert/strict";

import {
  buildOpenMeteoCurrentWeatherUrl,
  isValidOpenMeteoCurrentPayload,
  normalizeLatitudeParam,
  normalizeLongitudeParam,
} from "./localWeatherProxyModel";

assert.equal(normalizeLatitudeParam("42.3656"), 42.3656);
assert.equal(normalizeLatitudeParam("nope"), null);
assert.equal(normalizeLatitudeParam("90"), 90);
assert.equal(normalizeLatitudeParam("90.1"), null);
assert.equal(normalizeLongitudeParam("-180"), -180);
assert.equal(normalizeLongitudeParam("-180.1"), null);

const url = buildOpenMeteoCurrentWeatherUrl({ latitude: 42.3656, longitude: -71.0096 });

assert.equal(url.origin, "https://api.open-meteo.com");
assert.equal(url.searchParams.get("latitude"), "42.3656");
assert.equal(url.searchParams.get("longitude"), "-71.0096");
assert.equal(url.searchParams.get("wind_speed_unit"), "kn");
assert.equal(url.searchParams.get("forecast_days"), "1");
assert.ok(url.searchParams.get("current").includes("temperature_2m"));

assert.equal(isValidOpenMeteoCurrentPayload({ current: {} }), true);
assert.equal(isValidOpenMeteoCurrentPayload({ current: null }), false);
