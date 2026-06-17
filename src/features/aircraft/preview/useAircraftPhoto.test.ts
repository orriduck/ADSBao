import assert from "node:assert/strict";
import {
  aircraftPhotoQueryKeys,
  buildPhotoKey,
} from "./useAircraftPhoto";

const aircraft = {
  icao24: " a1b2c3 ",
  registration: " n123ab ",
  type: " b738 ",
};

assert.equal(buildPhotoKey(aircraft), "A1B2C3:N123AB:B738");
assert.equal(buildPhotoKey({ registration: "N123AB" }), "");
assert.equal(buildPhotoKey(null), "");
assert.deepEqual(aircraftPhotoQueryKeys.detail(aircraft), [
  "aircraft-photo",
  "A1B2C3:N123AB:B738",
]);

console.log("useAircraftPhoto.test.ts: ok");
