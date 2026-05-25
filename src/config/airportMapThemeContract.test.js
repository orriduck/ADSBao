import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  RUNWAY_ANNOTATION_STYLE_CONFIG,
  SELECTED_AIRCRAFT_TRACE_STYLE,
} from "./airportMap.js";
import { buildProcedureRenderLayers } from "../features/airport/map/procedureOverlayModel.js";
import { getProcedureSegmentStyle } from "../features/airport/map/procedureSegmentModel.js";

const assertThemeVar = (value, label) => {
  assert.match(
    value,
    /^var\(--[a-z0-9-]+\)$/,
    `${label} should resolve through a CSS theme variable`,
  );
};

const styleCss = readFileSync(new URL("../style.css", import.meta.url), "utf8");

[
  "--theme-font-sans",
  "--theme-font-mono",
  "--theme-primary-bright",
  "--theme-primary-deep",
  "--sidebar-muted",
  "--sidebar-faint",
  "--sidebar-signal",
  "--map-label-shadow",
  "--map-attribution",
  "--airport-range-ring-minor",
  "--airport-range-ring-major",
  "--airport-range-ring-band",
  "--aircraft-trace-line",
  "--aircraft-trace-glow",
  "--aircraft-trace-point",
  "--runway-annotation-line",
  "--runway-approach-line",
  "--runway-approach-beam",
  "--nearby-runway-line",
  "--procedure-segment-line",
  "--procedure-silk-blur",
  "--procedure-silk-body",
  "--procedure-silk-thread",
].forEach((token) => {
  assert.match(styleCss, new RegExp(`${token}\\s*:`), `${token} should be defined`);
});

assert.match(
  styleCss,
  /--font-sans:\s*var\(--theme-font-sans\)/,
  "Tailwind font utility should resolve through the theme font token",
);

assert.match(
  styleCss,
  /\.aircraft-trace--flightaware-route(?:-glow)?[\s\S]*stroke-dasharray:\s*10 12/,
  "FlightAware route SVG classes should enforce dashed rendering in production",
);

for (const theme of ["light", "dark"]) {
  const trace = SELECTED_AIRCRAFT_TRACE_STYLE[theme];
  assertThemeVar(trace.lineColor, `${theme} selected trace line`);
  assertThemeVar(trace.glowColor, `${theme} selected trace glow`);
  assertThemeVar(trace.pointColor, `${theme} selected trace point`);

  assertThemeVar(
    RUNWAY_ANNOTATION_STYLE_CONFIG.lineStyles[theme].color,
    `${theme} runway annotation line`,
  );
  assertThemeVar(
    RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors[theme],
    `${theme} runway beam`,
  );

  assertThemeVar(
    getProcedureSegmentStyle(theme).color,
    `${theme} procedure segment`,
  );

  buildProcedureRenderLayers({ type: "FeatureCollection", features: [] }, theme).forEach(
    (layer, index) =>
      assertThemeVar(layer.style.color, `${theme} procedure silk layer ${index}`),
  );
}

console.log("airportMapThemeContract.test.js ok");
