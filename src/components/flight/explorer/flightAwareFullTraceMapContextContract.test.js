import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const explorer = readFileSync(
  new URL("./FlightExplorer.jsx", import.meta.url),
  "utf8",
);
const traceProvider = readFileSync(
  new URL("../../aircraft/trace/SelectedAircraftTraceContext.jsx", import.meta.url),
  "utf8",
);

assert.match(
  explorer,
  /const showNearbyContext = flightDisplayContext\.showNearbyContext !== false;/,
);
assert.match(
  explorer,
  /const showNearbyMapContext =\s+flightDisplayContext\.showNearbyMapContext !== false;/,
);
assert.match(explorer, /const mapAircraft = useMemo\(/);
assert.match(explorer, /showNearbyMapContext\s+\? aircraft\s+:/);
assert.match(explorer, /const mapNearbyAirports = useMemo\(/);
assert.match(explorer, /showNearbyMapContext \? nearbyAirports : \[\]/);
assert.match(explorer, /showNearbyList: showNearbyContext/);
assert.match(explorer, /aircraft=\{mapAircraft\}/);
assert.match(explorer, /nearbyAirports=\{mapNearbyAirports\}/);
assert.match(explorer, /showSelectedTrace=\{showNearbyMapContext\}/);

assert.match(traceProvider, /showSelectedTrace = true/);
assert.match(traceProvider, /showSelectedTrace &&\s+primary\.aircraftHex/);

console.log("flightAwareFullTraceMapContextContract.test.js ok");
