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

POC-only recovery controls are available with `&threeOsmDebug=1`. Add
`&threeOsmTiles=fail` to replace the raster provider with a guaranteed failing
same-origin source and verify the degraded-basemap path without changing the
operational overlays.

Add `&threeOsmSoak=1` alongside Debug Mode to switch only the POC camera between
2D and 3D every seven seconds. The harness does not write the user's saved map
mode and exists only to support long-session resource and render diagnostics.
Debug Mode can also isolate `all`, `basemap`, `context`, `traffic`, or `flight`
scene groups without replacing the renderer or camera.

Add `&threeOsmStress=250` in Debug Mode to exercise the graduation target of
250 aircraft instances. The harness keeps every available live aircraft and
deterministically fills the remaining GPU and label workload with clearly
reported synthetic clones. Those clones exist only in the POC renderer, select
their original live aircraft when tapped, and never enter the accessible
live-aircraft summary or the normal map path.

Add `&threeOsmAcceptance=1` with Debug Mode, the 250-target stress harness, and
soak mode on a physical iPhone to start a session-scoped acceptance record. The
record survives ordinary page reloads so a document/runtime restart becomes
failure evidence rather than silently starting a clean timer. It records the
20-minute wall clock, real touch pointer interactions, background/foreground
render recovery, camera-mode switches, tile/provider state, WebGL recovery,
bounded GPU counters, Long Tasks, and JavaScript heap samples when the browser
exposes them. It also records the maximum rendered, live, synthetic, and
requested stress-target counts as non-gating capacity evidence. The operator
must mark the phone's thermal state because browsers do not expose a
trustworthy device-temperature API. The report can be shared or downloaded as
JSON; it contains provider identity and state but never the tile URL or browser
key.

The acceptance verdict remains `incomplete` until all eleven gates pass. A
desktop viewport or emulated user agent cannot be reported as the physical
iPhone result: the exported user agent/touch evidence is only a candidate
signal and the operator still confirms the hardware. Use **Reset report** at
the start of the physical run, perform at least ten touch interactions and one
background/foreground cycle, then mark the observed thermal state after the
20-minute timer completes and export the report. Expand **Gate details** during
the run to inspect each gate's live status and evidence; pending and failed
requirements remain visible without covering the map when the list is closed.
The same panel exposes the browser screen-wake-lock state and an explicit
enable/retry control so an operator does not accidentally invalidate the long
run by letting the phone sleep. Wake-lock and traffic-capacity samples are
included in the exported session as operator-assistance evidence, but they
deliberately do not create a twelfth gate or excuse the required
background/foreground cycle.

Before opening the page on a physical phone, run `pnpm debug:device` for the
default OSM source. It prints a key-free private-LAN acceptance URL only after
checking the frontend root, that exact KBOS deep link, and the proxied service
health endpoint through the same origin the phone will use. The command exits
nonzero when any LAN probe fails; fix macOS Local Network/firewall permission or
Wi-Fi client isolation before proceeding, and do not substitute a public tunnel
without explicit authorization. Both devices must be on a network that permits
client-to-client traffic.

For a licensed-provider run, put all four public-browser fields listed below in
ignored `.env.local`, then use `pnpm debug:device:configured`. It restarts the
frontend so Vite adopts the provider fields, requires all four to be present,
and prints only their count—not their values or tile URL. Open only the emitted
acceptance URL. On an insecure HTTP LAN origin, report sharing may fall back to
downloading the JSON file; that does not change the eleven acceptance gates.

Verify an exported report from the repository rather than trusting its saved
verdict:

```bash
pnpm debug:device:report -- /path/to/adsbao-three-osm-acceptance-ID.json
pnpm debug:device:report:configured -- /path/to/adsbao-three-osm-acceptance-ID.json
```

The first command recomputes all eleven gates from a structurally validated
KBOS session and exits zero only for a passing report. The second additionally
requires a ready, non-OSM configured provider from the runtime/build adapter;
an OSM or configured-unavailable report remains structurally valid but cannot
satisfy that extra requirement. Exported and recomputed evaluations must match,
and the report timestamp must follow the final sample. The verifier prints only
gate evidence and provider identity/state, never the report body, provider URL,
or browser key. This makes the handoff reproducible; it cannot cryptographically
prove physical possession, so the operator's explicit iPhone and thermal
confirmations remain required evidence.

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
  3×3. A 72-entry LRU deduplicates in-flight loads and retains only recent GPU
  textures across adjacent grid changes. There is no prefetch, offline archive,
  or background scan.
- Device pixel ratio is capped at 1.5 desktop and 1.25 compact.
- Rendering is event-driven: resize, camera interaction, live traffic changes,
  or tile completion request a frame. There is no permanent animation loop.
- The runtime listens to `prefers-reduced-motion`, `prefers-contrast`, and
  `forced-colors`. Reduced motion keeps the existing on-demand renderer and
  disabled camera damping. Increased contrast makes operational lines and
  canvas labels opaque with stronger borders; forced colors resolve the user
  agent's `Canvas`, `CanvasText`, `Highlight`, and `HighlightText` system colors
  into the WebGL/canvas palette. Raster tiles remain untinted so geography is
  not destroyed by multiplying a system background color into the texture.
- Orthographic and perspective modes reuse one `OrbitControls` instance and
  retarget it to the active camera, avoiding listener/allocation churn during
  repeated mode changes.
- WebGL context loss drops map readiness without discarding the bounded CPU-side
  tile cache; restoration re-uploads retained textures/materials and requests a
  fresh frame.
- Failed tiles remain on a neutral plane while aircraft, labels, runways, and
  other operational geometry continue rendering. Error entries retry at a
  bounded 30-second cadence rather than on every render or interaction.
- The map exposes draw-call, triangle, texture, geometry, shader-program,
  render-duration/count, Long Task, background/foreground, tile, aircraft,
  pixel-ratio, and camera-profile diagnostics as `data-poc-*` attributes.

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

With items one through four now substantially represented in the branch, the
remaining priority is: (1) a real iPhone-class 20-minute touch/background/
thermal run, (2) a licensed raster provider trial through the existing adapter,
then (3) additional vector-cartography or aesthetic depth. Real navaid and
photo-location interaction checks are now complete. The Debug-only 250-target
capacity harness now makes the first run reproducible, but desktop evidence
does not clear its real-device gate. More visual polish should not move ahead
of the first two graduation risks.

While the first two gates require external hardware or provider authorization,
the next local-only cartography sequence is: runway approach direction,
dark-theme airport ground lighting, then only measured building or terrain
depth. Approach direction comes first because it remains operationally useful
at every airport zoom and in both themes; ground lighting is limited to the
dark detail view, while buildings and terrain are contextual rather than
flight-operation semantics.

The first item is implemented in the branch POC. Item two now includes focal
runways, nearby airports, airspace boundaries, conditional navaids, reporting
points, watcher locations, and user location. Context-tile loading no longer
requires a hidden Leaflet map instance: the Three/OSM tile grid supplies its
own bounds. Airspace boundaries remain one batched `LineSegments` object with
a segment-to-airspace id map for raycasting; aircraft hits keep priority, while
an airspace hit feeds the existing selection contract and adds only one selected
boundary batch plus a high-priority identity/class label. Item three now
includes pointer and keyboard picking,
selected-aircraft styling, live selected traces, flight-page route geometry,
and an accessible DOM summary of the visible map. Traffic now resolves five
bounded operational silhouette families (`transport`, `heavy`, `light`,
`rotorcraft`, and `high-performance`) from the existing ICAO type/category
fields. Each active family uses one fill and one contrast InstancedMesh, with
the existing ADS-B wake-category scale and one bounded selection-ring batch;
focal and secondary selection semantics remain distinct without creating
per-aircraft scene objects. Projected labels now try four stable quadrants in
priority order, so a high-priority label can move inward at a viewport edge or
around an existing label instead of disappearing. Canvas text uses the product
Figtree/Noto Sans SC stack, while the POC map aria, summary, status, and navaid
count semantics follow the active English or Simplified Chinese locale. Route
and recorded-trace camera
fitting consumes the existing product signals: it chooses a bounded tile zoom
from the geographic envelope and actual viewport aspect, frames the same
geometry with either camera, handles dateline wrapping, restores Follow without
replacing the runtime, and guards full-route endpoints when live route data
exists. The default perspective camera also derives distance from the loaded
tile radius and actual aspect. It uses a 60-degree elevation and a projected
north-up vector instead of the former shallow diagonal pose, keeping the tile
plane centered and readable on portrait screens. Airport exploration now
clamps the 2D/3D ground footprint to the loaded tile grid and derives its
minimum orthographic zoom from that coverage. Flight
tracking inherits the existing locked-camera contract, so Follow/trace controls
rather than direct gestures own its framing. The raster URL and attribution now
sit behind a replaceable source contract, and the bounded cache explicitly
disposes evicted or unmounted textures. The runtime now handles WebGL context
loss/restoration, exposes a POC-only GPU reset control, and has an explicit
provider-outage mode with a neutral fallback and bounded retry. A production
provider decision and a real-device long-session acceptance run remain
incomplete.

Airport exploration now also keeps one manual camera snapshot per mode inside
the current Three.js runtime. A user can pan or zoom the orthographic camera,
switch to a separately rotated perspective camera, and return to either view
without losing its target, position, or 2D zoom. The snapshots are deliberately
runtime-local rather than browser-persistent: a changed scene center, route-fit
scope, interaction lock, compact/desktop tile radius, Follow resume, or explicit
Recenter invalidates them. The existing `Recenter on airport` control now sends
an explicit signal to the POC instead of becoming a no-op while Leaflet is
disabled.

Small operational context markers now use a separate screen-space selection
model rather than requiring their low-poly visual geometry to be hit exactly.
Desktop pointers receive a 14 CSS-pixel radius and touch pointers receive 22
pixels; aircraft selection remains first, context points second, and airspace
boundaries last. Debug layer isolation also applies to picking, so a hidden
traffic batch cannot intercept a context-only check. Airport labels keep the
short public display code while selection passes the full ICAO identity. A
bounded DOM mirror exposes selectable airports, individual navaids, reporting
points, and photo locations to assistive technology, while aggregate navaid
counts remain informational.

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

## Tile-provider direction

The current `tile.openstreetmap.org` source remains development-only. The
[OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) calls
the service best-effort with no SLA, prohibits bulk download/prefetch, requires
cache and attribution compliance, and explicitly recommends a switchable URL.
The POC's bounded current-view requests are appropriate for research, but the
community service is not a production availability contract.

The next provider step should preserve the renderer experiment rather than add
a vector-map engine at the same time:

1. Evaluate a licensed 256px raster XYZ source through the existing adapter.
   [MapTiler Cloud](https://www.maptiler.com/cloud/pricing/) is a concrete fit:
   its non-commercial Free plan currently includes 100,000 requests/month and
   standard raster XYZ tiles, while third-party renderers are billed per tile.
   The free service pauses at quota and has no SLA, so it is suitable for a
   limited branch trial, not an unmeasured production default. Its
   [terms](https://www.maptiler.com/terms/cloud/) require direct end-user
   requests unless proxy use is separately approved.
2. Keep self-hosted PMTiles on Cloudflare R2 as the control-oriented follow-up,
   not the immediate raster substitution. The
   [Protomaps planet archive](https://docs.protomaps.com/basemaps/downloads) is
   currently roughly 120 GB and is a vector basemap; adopting it would also
   require the MVT/style/glyph/collision work deliberately excluded from this
   POC. Protomaps recommends R2 for PMTiles range requests, and
   [R2 pricing](https://developers.cloudflare.com/r2/pricing/) has no egress
   charge but still meters storage and reads.

No provider credential is committed or requested by the POC. A browser key,
domain restriction, quota alert, and provider-specific attribution must be in
place before a hosted source is exercised.

The branch now has a provider-neutral trial boundary. Deployed Cloudflare hosts
read the following browser-visible values from the no-store `/runtime-env.js`
response, so changing a Worker binding and reloading the page does not require
rebuilding or releasing the application bundle. Local Vite work can use the
same names in ignored `.env.local` as a build-time fallback; Cloudflare local
preview can use ignored `.dev.vars.preview`. Never put the values in a query
string or committed file. Enable the source with
`?threeOsmPoc=1&threeOsmTiles=configured`:

```dotenv
VITE_THREE_OSM_RASTER_SOURCE_ID=licensed-raster
VITE_THREE_OSM_RASTER_URL_TEMPLATE=https://tiles.example.test/style/256/{z}/{x}/{y}.png?key=PUBLIC_BROWSER_KEY
VITE_THREE_OSM_RASTER_ATTRIBUTION=Provider attribution text
VITE_THREE_OSM_RASTER_ATTRIBUTION_URL=https://provider.example.test/attribution
```

The adapter accepts only HTTPS templates containing all three `{z}`, `{x}`, and
`{y}` tokens, requires a valid HTTPS attribution URL, and exposes only the
source id, config state, and `runtime`/`build` origin through diagnostics. The
four runtime values switch atomically: if any runtime field is present, no
missing field is backfilled from an older build-time provider. If `configured`
is requested while the runtime group is partial, absent, or invalid, the
basemap deliberately enters the degraded path instead of silently falling back
to OSM and producing a false provider-validation result. The service worker
also keeps `/runtime-env.js` network-only. As with any client-rendered map, a
configured key is delivered to the browser; it must therefore be a
provider-authorized public browser key with domain restrictions, not a server
secret.

## Local performance evidence

The current branch has a measured mobile-size browser baseline, but not a real
phone acceptance result. At a 390×844 viewport with DPR capped to 1.25, Chrome
reported WebGL 2 through ANGLE's Metal renderer on an Apple M1 Max.

- A 20 minute 16 second clean camera soak completed 174 automatic 2D/3D
  switches and 928 renders in one runtime. Nine tiles stayed loaded; GPU
  resources stayed at 7 textures, 8 geometries, and 9 shader programs while
  live traffic varied around the 220-target cap.
- Three scene submissions exceeded 50 ms during one JavaScript garbage
  collection cycle around minute 16; the maximum was 205.6 ms and those three
  Long Tasks totaled 421 ms. Heap samples oscillated rather than growing
  monotonically, including a 194.1 MB to 173.5 MB collection. Current canvas
  listener inspection remained fixed at 11 listeners.
- Debug isolation showed the raster basemap at approximately 0.1 ms, traffic at
  6.9 ms, context at 14 ms, and the recombined scene at 32.3 ms in the sampled
  steady frames, with no Long Tasks in those isolation windows.
- `OrbitControls` now survives camera changes. A follow-up five-minute run made
  42 camera retargets and 225 renders with zero new controls instances, slow
  scenes, Long Tasks, or console errors. That shorter run did not include a
  complete heap collection cycle, so it proves allocation-path removal but not
  a reduced long-session memory maximum.
- Type-aware traffic batching produced four active families for the sampled
  KBOS payload. Sharing each family's geometry between fill and halo reduced a
  traffic-only scene from 9 to 5 geometries; a matched 45-second window made 18
  traffic rebuilds with a 1.0 ms maximum, zero slow scenes, and one 51 ms Long
  Task. A pre-sharing window had three Long Tasks and nine geometries, so the
  allocation path improved, but this short comparison is not a replacement for
  the real-device long-session gate.
- Coverage-aware default 3D framing rendered the 390×844 scene at a 549.8 world
  distance with 9 tiles and the 1280×720 scene at 781.3 with 25 tiles. Both kept
  north-up text, airport-centered coverage, zero horizontal overflow, and zero
  slow scenes; a 3D→2D return kept the same runtime and removed the
  perspective-only diagnostics. These are browser visual checks, not touch or
  thermal evidence.
- The edge-aware label pass was checked in English and Simplified Chinese,
  light and dark themes, at 1280×720 and 390×844. A live English dark 3D KBOS
  frame placed 36 labels with 11 using a fallback quadrant; the compact frame
  placed 3 with 1 fallback, stayed at 9 loaded tiles, and had no horizontal
  overflow. Localized DOM summaries exposed the correct active locale and
  altitude units. Synthetic context coverage verified the Chinese `导航台`
  canvas label because the live local context payload did not consistently
  contain navaid counts during this check.
- A real local KBOS context tile returned 30 visible airspaces. In context-only
  Debug Mode, clicking the visible boundary selected `BOSTON CLASS E5`, changed
  the POC diagnostic from zero to one airspace highlight, drew its solid selected
  boundary and `BOSTON CLASS E5 · E` label, and synchronized the existing
  Airspace preview with CTA, controlled access, Class E, 700 ft AGL–FL600, and
  OpenAIP source. The temporarily enabled airspace preference was restored after
  the check.
- In a live desktop KBOS interaction, the 3D camera was rotated from its default
  frame, then the 2D camera was independently zoomed from `1.000` to `1.283`.
  Two complete 2D/3D round trips restored exact diagnostic position/target
  values for both cameras and the exact 2D zoom, while keeping one shared
  controls runtime. Activating the existing Recenter command invalidated the
  saved scope and returned 2D zoom to `1.000`. Same-size production KBOS kept
  the same airport center and operational range but, as expected, retained the
  richer vector-cartography and per-model aircraft baseline.
- A fresh local KBOS accessibility-tree inspection exposed the POC as a named
  region with a mode-specific description, a live aircraft/airport/runway
  summary, keyboard-selection instructions, a bounded first-aircraft list, and
  linked OSM attribution. The renderer remains request-driven and camera
  damping is disabled, so the POC does not add an autonomous camera-animation
  loop.
- A native DevTools media emulation at 390×844, DPR 3 matched reduced motion,
  increased contrast, and forced colors simultaneously. The POC reported
  `motion=reduced`, `contrast=forced`, `forced-palette=system`, on-demand
  rendering, and disabled damping; compact coverage remained 9/9 tiles with
  zero failures and zero horizontal overflow. A separate emulation with forced
  colors disabled matched `prefers-contrast: more` and selected that palette
  independently. The real system-color screenshot kept the raster geography,
  changed canvas labels and operational geometry to the emulated user palette,
  and retained selected-state shape/ring differences.
- In context-only Debug Mode, clicking the browser-controlled canvas center no
  longer selected an invisible aircraft. The live local KBOS tree exposed 26
  nearby airports as selectable context buttons; selecting OWD through the
  same callback highlighted its POC marker and opened the existing airport
  preview with 12.8 NM, 49 ft, and Track airport. Production KBOS selected OWD
  through its airport list and showed the same interaction contract at 13 NM
  and 49 ft, plus the richer Norwood Memorial Airport name. The browser control
  surface was later exercised at a projected arbitrary canvas coordinate in the
  390×844 emulation: a physical click on the OWD marker set
  `last-pick=airport:KOWD`, selected the marker, and opened the 12.8 NM / 49 ft
  preview. Direct DevTools touch injection was rejected by the in-app browser,
  and mouse-to-touch translation did not produce a trusted touch pointer, so
  the 22 CSS-pixel touch radius remains covered by deterministic projection/
  radius tests until the real iPhone gate.
- The visible Debug Mode context controls now reserve one representative per
  available context kind before filling the remaining eight slots. This avoids
  airport-dense payloads hiding every navaid, reporting point, or photo location
  from browser verification. Live local EGLL exposed 63 selectable airports and
  13 selectable reporting points; selecting `ALLY PALLY` through its visible
  reporting-point control selected the canvas label and accessible mirror and
  opened the existing Reporting point preview with GB and OpenAIP source. The
  same diagnostics report per-kind selectable counts. Current local payloads
  did not expose a selectable navaid or photo location during this check, so
  those two live-data interactions remain open rather than being inferred from
  synthetic tests.
- Focal runways no longer depend on WebGL's effectively fixed one-pixel line
  width. The centerline collection now carries runway id and physical width,
  and the POC builds all visible runway segments into one neutral halo mesh and
  one surface mesh. Physical width is preserved when it is visually meaningful;
  a bounded minimum world width keeps a runway legible at the airport overview
  range without turning it into a screen-space DOM overlay. Live local KBOS
  produced 6 runway segments / 36 surface vertices in both cameras. Light 2D,
  dark 2D, and dark 3D kept 25/25 tiles, zero tile failures, and zero horizontal
  overflow; the two meshes add a fixed two draw calls rather than one object per
  runway. Same-size production KBOS remained the richer operational baseline,
  particularly for photo locations and vector context, so this clears runway
  geometry readability rather than overall map parity.
- Runway approach direction now reuses the production annotation model instead
  of inventing POC-only airport geometry. Light mode turns all 12 KBOS runway
  ends into one batched dashed-corridor mesh; dark mode triangulates all 12
  approach wedges into one batched mesh and carries the production near-to-far
  fade as vertex alpha. At detail zoom the local browser reported 132 dashes /
  792 vertices in light mode and 228 triangles / 684 vertices in dark mode,
  with 12 runway-end labels and 15,006 airport-surface vertices still present.
  Context-only rendering stayed at 15 draw calls in both 2D and 3D, so the new
  cue costs one fixed draw call rather than one object per runway end. Visual
  inspection found the first flat-opacity dark treatment too heavy; the final
  vertex fade kept the near-end orientation cue while letting the runway and
  taxiway network remain dominant. Production KBOS was used as the same-size
  semantic-density baseline, not as proof that the experimental renderer has
  reached overall parity.
- Dark detail views now reuse the production runway-ground-lighting model and
  the same surface collection. The Three scene creates no lighting geometry in
  light mode or below zoom 13.5. At local KBOS zoom 14 it represented 78 runway
  lighting features, 24 REIL points, and 254 taxiway/taxilane features as five
  fixed batches: white runway, amber caution, blue taxiway underlay, green
  taxiway dashes, and one instanced REIL set. The real payload produced 684
  runway dashes, 2,668 taxiway dashes, and 34,134 lighting vertices. Browser
  inspection in dark 2D and 3D kept the runway network dominant and made the
  airport movement area readable without glow, blur, per-light objects, or a
  continuous animation loop. After the theme rebuild settled, the desktop POC
  reported a 1.8 ms render / 0.5 ms scene render with no recorded long task;
  the observed 35.2 ms maximum remains desktop-only evidence and does not clear
  the real-device performance gate. Production KBOS remained the visual-density
  baseline, while its wider live camera scale prevented a pixel-identical
  airport-detail comparison.
- Live context selection now has browser evidence beyond fixture coverage.
  A fresh local KJFK profile hydrated 12 real OpenAIP navaids end to end; the
  POC selected JFK VOR-DME in both cameras and retained the existing preview
  semantics (KENNEDY, 115.9 MHz, elevation, and source-backed identity). The
  local Go service currently has no KJFK photo locations, so a second local
  Vite process used the same branch while read-only proxying the public
  production API. Its 16 real photo locations remained selectable in 2D and
  3D, and the selected Cargo Plaza location retained its full name, distance,
  source, safety disclaimer, and Go action in the DOM preview. Map-only photo
  labels now remove the descriptive suffix after a spaced dash and cap the
  remaining location name at 28 characters; the accessible selection list and
  preview keep the full source text. This reduced KJFK label obstruction with
  zero horizontal overflow without weakening the selection contract.
- Configured raster providers now use the existing no-store Cloudflare
  `/runtime-env.js` control plane instead of depending only on build-time Vite
  values. A page reload can therefore adopt changed Worker bindings without an
  application-bundle release. The four provider fields switch as one group;
  partial runtime input cannot combine with an older embedded source. A local
  no-key OSM smoke source proved `origin=runtime`, 25/25 tiles loaded, zero
  failures, correct attribution, and zero horizontal overflow. A deliberate
  one-field runtime input proved the opposite path: `configured-unavailable`,
  25/25 failed, degraded basemap, and live aircraft still visible. Restoring
  the empty local runtime file returned default OSM to 25/25 ready while the
  explicit configured entry remained honestly degraded. This validates the
  runtime control/failure boundary only; it is not a licensed-provider trial.
- The Debug-only `threeOsmStress=250` harness closes the former 220-target test
  ceiling without inventing normal-map traffic. At a 390×844 local KBOS
  viewport, the scene held 250 instances from 163 live and 87 synthetic targets
  in four family batches; live updates shifted that split while preserving the
  total. Label collision stayed capped at 24, selecting a live target created
  exactly one highlight, traffic rebuild time peaked at 3.4 ms, scene render
  time peaked at 23.3 ms, horizontal overflow remained zero, and the console
  recorded no errors. The acceptance recorder captured rendered, live,
  synthetic, and requested-target maxima without changing the eleven gates.
  This is desktop capacity evidence only; the emitted physical-device URL now
  includes the same stress flag so gate four can be tested honestly on an
  iPhone.
- Same-size production KBOS remains the semantic visual baseline: it currently
  has per-model aircraft SVGs plus more airspace and watching-spot context.
  The POC now carries coarse family/wake semantics, and its larger silhouettes
  and bounded label collision are easier to scan, but this is not per-model
  parity. Different live context payloads also prevent a broader parity claim.

This browser evidence clears the next architecture iteration, not the real
device gate. A 20-minute iPhone-class run with background/foreground cycles,
touch gestures, and device memory/thermal observation is still required.

## What this can simplify

- One geographic projection and one camera state instead of Leaflet/MapLibre
  synchronization.
- One bounded family-batch and picking path instead of Leaflet canvas hit
  tests, MapLibre DOM markers, and a separate Three custom layer.
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
- Browser-injected WebGL context loss/restoration now passes without rebuilding
  the runtime. GPU memory under long sessions and real-device background-tab
  recovery still need explicit acceptance tests.

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
- CSS Color Adjustment / forced colors: https://drafts.csswg.org/css-color-adjust/
- OSM raster tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- OSM vector tile usage policy: https://operations.osmfoundation.org/policies/vector/
- OSM attribution guideline: https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
