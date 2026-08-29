# Three.js + OpenStreetMap unified map POC

Date: 2026-08-29

## Question

Can ADSBao replace the current split map runtime — Leaflet for 2D and
MapLibre plus DOM/Three overlays for 3D — with one Three.js scene that keeps
the same operational objects and changes only its camera profile?

## Working answer

Yes for the renderer and interaction core; not yet for the complete cartographic
stack. A single Three.js scene can own both an orthographic 2D camera and a
perspective 3D camera, use instancing for aircraft, raycasting for selection,
and render OSM raster tiles on a local Web Mercator grid. The expensive unknown
is not WebGL throughput. It is replacing mature map-engine work around vector
style evaluation, multilingual labels, collision avoidance, tile lifecycle,
accessibility, and provider policy.

The branch POC therefore proves the shared renderer first and deliberately
does not claim production parity.

## POC boundary

Open an airport or flight route with `?threeOsmPoc=1`, for example:

`http://localhost:3000/airport/KBOS?threeOsmPoc=1`

The query flag replaces both visible map modes with one Three.js scene:

- 2D uses `OrthographicCamera`.
- 3D uses `PerspectiveCamera`.
- The scene, OSM tile grid, aircraft instances, altitude stems, selection
  raycaster, and GPU resource lifecycle are shared.
- A shared projected-label canvas now provides collision-bounded aircraft and
  airport identifiers in both camera modes. Nearby-airport markers and focal
  runway centerlines live in the same geospatial scene.
- Selected aircraft traces now render in that shared scene with a true-altitude
  line, ground projection, and current-height connector. Flight tracking pages
  can also pass their existing great-circle route model into a dashed Three.js
  route and destination marker without rebuilding route ownership in the map.
- Desktop requests only a 5×5 current-view tile grid; compact layouts request
  3×3. There is no prefetch, offline archive, or background scan.
- Device pixel ratio is capped at 1.5 desktop and 1.25 compact.
- Rendering is event-driven: resize, camera interaction, live traffic changes,
  or tile completion request a frame. There is no permanent animation loop.
- The map exposes draw-call, triangle, texture, tile, aircraft, pixel-ratio,
  and camera-profile diagnostics as `data-poc-*` attributes.

## Implementation order

The production KBOS comparison makes the dependency order clear. Work should
continue in this order rather than polishing the 3D treatment first:

1. **Operational legibility:** shared callsign/airport labels, focal identity,
   collision bounds, and constant-screen-size aircraft in both cameras.
2. **Geographic semantics:** runway geometry, nearby airports, airspaces,
   navaids, reporting points, watcher locations, and user position.
3. **Selection and trace:** unified picking, selected-state semantics, selected
   trace and route geometry, keyboard access, and an accessible DOM summary.
4. **Map interaction parity:** bounded pan/zoom, recenter/follow behavior,
   fit-to-trace, saved camera state, touch tuning, and context loss recovery.
5. **Tile architecture:** provider adapter, bounded LRU cache, failure fallback,
   attribution enforcement, and production-safe terms/capacity.
6. **Measured optimization:** real-device 20-minute sessions, frame/long-task
   budgets, memory stability, and only then additional visual depth or effects.

The first item is implemented in the branch POC. Item two now includes focal
runways, nearby airports, airspace boundaries, conditional navaids, reporting
points, watcher locations, and user location. Context-tile loading no longer
requires a hidden Leaflet map instance: the Three/OSM tile grid supplies its
own bounds. Item three now includes pointer and keyboard picking,
selected-aircraft styling, live selected traces, flight-page route geometry,
and an accessible DOM summary of the visible map. Route and recorded-trace
camera fitting now consumes the existing product signals: it chooses a bounded
tile zoom from the geographic envelope and actual viewport aspect, frames the
same geometry with either camera, handles dateline wrapping, restores Follow
without replacing the runtime, and guards full-route endpoints when live route
data exists. A stronger selected-state/aircraft silhouette, bounded interaction,
and long-session recovery remain the next incomplete operational boundary.

## Proposed architecture if the POC graduates

```text
airport / flight state
        |
        v
geospatial scene model
  - local Web Mercator origin
  - aircraft / trace / runway / airspace geometry
  - stable object IDs and selection
        |
        v
single Three.js scene + renderer
  |                         |
  v                         v
orthographic camera      perspective camera
2D operations mode       3D altitude mode
        |
        v
tile source adapter + bounded LRU cache
  - POC: OSM raster tiles
  - candidate production: licensed vector/raster provider or self-hosted tiles
```

The scene model, not React components or a map library, becomes the ownership
boundary. Camera changes do not rebuild aircraft, traces, or tile ownership.

## What this can simplify

- One geographic projection and one camera state instead of Leaflet/MapLibre
  synchronization.
- One aircraft geometry and picking path instead of Leaflet canvas hit tests,
  MapLibre DOM markers, and a separate Three custom layer.
- Real altitude, trace, runway, and airspace geometry can share the same depth
  and clipping rules.
- `InstancedMesh` reduces draw calls for repeated aircraft geometry.
- A single renderer makes mobile pixel-ratio, GPU-memory, and cleanup policy
  explicit.

## What remains high risk

- Raster tiles bake labels into the texture, so ADSBao cannot independently
  localize, declutter, or restyle them.
- Pure Three.js vector tiles require an MVT decoder, style-expression engine,
  line/polygon tessellation, glyph shaping, sprite loading, and label collision
  system. Rebuilding all of MapLibre is not justified.
- OSM Foundation tile services are best-effort and prohibit bulk download,
  prefetch, and offline use. The POC's bounded interactive requests comply with
  the usage shape, but production needs a replaceable provider adapter and a
  provider whose capacity/terms fit ADSBao traffic.
- DOM-free labels need a dedicated plan. Per-aircraft canvas textures are easy
  but can churn memory; signed-distance-field text or a small accessibility DOM
  mirror needs measurement.
- Touch controls must be tuned as a map, not left at generic OrbitControls
  defaults. One-finger pan, two-finger zoom/rotate, and selection-vs-drag
  thresholds need device testing.
- WebGL context loss, GPU memory under long sessions, and background-tab
  recovery need explicit acceptance tests.

## Graduation gates

Do not replace the active map runtime until all of these pass:

1. 2D and 3D preserve airport, aircraft, trace, runway, airspace, navaid,
   reporting-point, spot, and user-location semantics.
2. Map labels remain readable and collision-bounded in both themes and both
   languages.
3. A 20-minute iPhone-class session shows stable GPU resources after repeated
   2D/3D switches, route changes, and background/foreground cycles.
4. Interaction remains responsive with 250 aircraft and the full operational
   overlay set; target frame and long-task budgets are recorded on real devices.
5. Tile provider, attribution, caching, outage fallback, and usage terms are
   production-safe and switchable without an application release.
6. Reduced-motion, keyboard selection, screen-reader map summaries, and
   high-contrast controls retain the existing accessibility contract.

## Primary sources

- Three.js camera guidance: https://threejs.org/manual/en/cameras.html
- Three.js `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js `Raycaster`: https://threejs.org/docs/pages/Raycaster.html
- Three.js `OrbitControls`: https://threejs.org/docs/pages/OrbitControls.html
- Three.js rendering on demand: https://threejs.org/manual/en/rendering-on-demand.html
- Three.js responsive/DPR guidance: https://threejs.org/manual/en/responsive.html
- Three.js resource cleanup: https://threejs.org/manual/en/how-to-dispose-of-objects.html
- OSM raster tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- OSM vector tile usage policy: https://operations.osmfoundation.org/policies/vector/
- OSM attribution guideline: https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
