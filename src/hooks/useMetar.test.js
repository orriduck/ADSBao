import assert from "node:assert/strict";

import { formatCeiling } from "../features/metar/metarModel.js";

{
  assert.equal(
    formatCeiling({
      clouds: [
        { cover: "SCT", base: 800 },
        { cover: "BKN", base: 1700 },
        { cover: "OVC", base: 1800 },
      ],
    }),
    "BKN 1,700 ft",
  );
}

{
  assert.equal(formatCeiling({ clouds: [] }), "CLR");
}
