import assert from "node:assert/strict";

import {
  DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  resolveSpottingMetricZoomState,
} from "./airportExplorerUiModel";

assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showMapLabels,
  false,
);
assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showRunwayBeams,
  true,
);
assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showNavaidMarkers,
  false,
);
assert.equal(
  DEFAULT_AIRPORT_EXPLORER_UI_STATE.showAirspaces,
  true,
);

{
  const update = resolveSpottingMetricZoomState({
    activeView: "traffic",
    currentZoom: 10,
    previousZoom: null,
    detailZoom: 13,
    fallbackZoom: 10,
  });

  assert.deepEqual(update, {
    nextZoom: 13,
    nextPreviousZoom: 10,
  });
}

{
  const update = resolveSpottingMetricZoomState({
    activeView: "spotting",
    currentZoom: 13,
    previousZoom: 10,
    detailZoom: 13,
    fallbackZoom: 10,
  });

  assert.deepEqual(update, {
    nextZoom: 10,
    nextPreviousZoom: null,
  });
}

{
  const update = resolveSpottingMetricZoomState({
    activeView: "spotting",
    currentZoom: 13,
    previousZoom: null,
    detailZoom: 13,
    fallbackZoom: 10,
  });

  assert.deepEqual(update, {
    nextZoom: 10,
    nextPreviousZoom: null,
  });
}

console.log("airportExplorerUiModel.test.ts ok");
