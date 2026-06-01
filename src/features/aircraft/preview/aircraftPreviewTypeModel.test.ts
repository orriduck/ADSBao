import assert from "node:assert/strict";

import { getAircraftPreviewTypeDisplay } from "./aircraftPreviewTypeModel";

assert.deepEqual(
  getAircraftPreviewTypeDisplay({ type: " e75l ", category: " a3 " }),
  {
    primary: "E75L",
    secondary: "Embraer 175",
    icaoType: "E75L",
    category: "A3",
  },
);

assert.deepEqual(
  getAircraftPreviewTypeDisplay({
    type: " a21n ",
    category: " a3 ",
    desc: "AIRBUS A-321neo",
  }),
  {
    primary: "A21N",
    secondary: "Airbus A321neo",
    icaoType: "A21N",
    category: "A3",
  },
);

assert.deepEqual(getAircraftPreviewTypeDisplay({}), {
  primary: "N/A",
  secondary: null,
  icaoType: "",
  category: "",
});
