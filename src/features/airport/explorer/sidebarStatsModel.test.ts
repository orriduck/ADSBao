import assert from "node:assert/strict";
import { buildSidebarStats, type BuildSidebarStatsInput } from "./sidebarStatsModel";
import { DEFAULT_UNIT_PREFERENCES } from "@/features/app-shell/unitPreferences/unitPreferencesModel";

const base: BuildSidebarStatsInput = {
  nearMe: false,
  selfSpeedMps: null,
  selfAltitudeMeters: null,
  selfHeadingDeg: null,
  groundSpeedUnit: "kmh",
  metar: null,
  metarLoading: false,
  localTemperatureC: null,
  localWeatherLoading: false,
  units: DEFAULT_UNIT_PREFERENCES,
  atcCount: 0,
  spottingCount: 0,
};
for (const nearMe of [false, true]) {
  for (const temperature of ["c", "f"] as const) {
    const weather = (value: number | null) => buildSidebarStats({
      ...base, nearMe, localTemperatureC: value, units: { ...base.units, temperature },
    }).contextRow[0];
    for (const missing of [null, NaN, Infinity]) {
      assert.equal(weather(missing).value, "—", "unavailable weather must not imply freezing temperature");
      assert.equal(weather(missing).unit, undefined);
    }
    assert.equal(weather(0).value, temperature === "c" ? 0 : 32, "real zero remains a valid temperature");
    assert.equal(weather(-5).value, temperature === "c" ? -5 : 23);
    assert.equal(weather(20).value, temperature === "c" ? 20 : 68);
  }
}
console.log("sidebarStatsModel.test.ts ok");
