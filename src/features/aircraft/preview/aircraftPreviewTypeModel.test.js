import assert from "node:assert/strict";

import { getAircraftPreviewTypeDisplay } from "./aircraftPreviewTypeModel.js";

assert.deepEqual(
  getAircraftPreviewTypeDisplay({ type: " b789 ", category: " a5 " }),
  {
    primary: "B789",
    secondary: "A5",
  },
);

assert.deepEqual(
  getAircraftPreviewTypeDisplay({ category: " a3 " }),
  {
    primary: "A3",
    secondary: null,
  },
);

assert.deepEqual(getAircraftPreviewTypeDisplay({}), {
  primary: "N/A",
  secondary: null,
});
