import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const navaidLabelLayerPath = fileURLToPath(
  new URL("./NavaidLabelLayer.tsx", import.meta.url),
);
const stylePath = fileURLToPath(new URL("../../style.css", import.meta.url));
const source = readFileSync(navaidLabelLayerPath, "utf8");
const styles = readFileSync(stylePath, "utf8");

assert.match(
  source,
  /import \{ Rss \} from "lucide-react"/,
  "navaid map markers should use the Lucide Rss icon",
);
assert.match(
  source,
  /renderToStaticMarkup/,
  "navaid map markers should render the Lucide icon into the Leaflet divIcon HTML",
);
assert.match(
  source,
  /absoluteStrokeWidth/,
  "navaid map markers should preserve stroke weight at 8px",
);
assert.match(
  source,
  /function NavaidLabelMarker/,
  "navaid marker markup should be abstracted behind a component",
);
assert.match(
  source,
  /renderToStaticMarkup\(\s*<NavaidLabelMarker/,
  "navaid marker icons should render the marker component into Leaflet HTML",
);
assert.match(
  source,
  /navaid-label navaid-label--signal-anchor/,
  "navaid map markers should anchor the signal icon separately from the text badge",
);
assert.match(
  source,
  /iconAnchor: \[4, 4\]/,
  "navaid marker anchor should target the signal icon center",
);
assert.doesNotMatch(
  source,
  /navaid-label__dot/,
  "navaid map markers should not render the old diamond dot",
);
assert.doesNotMatch(
  source,
  /navaid-label__signal-arc/,
  "navaid map markers should not hand-draw the RSS arcs",
);
assert.match(
  styles,
  /\.navaid-label__body strong \{\s+font-size: 8px;/,
  "navaid ident text should be one size smaller",
);
assert.match(
  styles,
  /\.navaid-label__body small \{\s+[^}]*font-size: 6px;/,
  "navaid type/frequency text should be one size smaller",
);

console.log("NavaidLabelLayer.test.ts ok");
