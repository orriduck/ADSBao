import assert from "node:assert/strict";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "./sidebarDisplay.js";

assert.equal(getAirportSidebarMode(767), "mobile");
assert.equal(getAirportSidebarOpenForMode("mobile"), false);

assert.equal(getAirportSidebarMode(768), "desktop");
assert.equal(getAirportSidebarMode(1024), "desktop");
assert.equal(getAirportSidebarOpenForMode("desktop"), true);
