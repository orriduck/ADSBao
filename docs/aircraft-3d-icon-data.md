# Aircraft 3D Icon Data

ADSBao immersive aircraft rendering uses the existing aircraft silhouette SVG
set as the source geometry for 3D map models. The pipeline keeps the current
license boundary intact: the SVGs remain GPL-3.0 assets under
`public/icons/aircraft`, while generated metadata and rendering rules live in
the application source.

## Source Assets

- Local SVGs: `public/icons/aircraft/*.svg`
- Upstream: <https://github.com/RexKramer1/AircraftShapesSVG>
- License: GNU GPL v3.0, documented in
  `public/icons/aircraft/ATTRIBUTION.md`

The SVGs are top-down silhouettes. They provide reliable outer geometry, but
not full semantic structure. For example, wing tips and nose/tail locations can
be inferred from silhouette bounds; propeller hubs, rotor centers, engines, and
anti-collision beacon positions require aircraft-family rules.

## Generated Anchor Data

The generated file is:

- `src/features/aircraft/icons/aircraftIconAnchors.generated.ts`

Regenerate it with:

```bash
/opt/homebrew/bin/pnpm exec tsx scripts/generate-aircraft-icon-anchors.ts
```

Each icon record stores:

- `viewBox`: the SVG viewBox, retained for scale and normalization.
- `family`: `jet`, `propeller`, `rotorcraft`, `balloon`, or `unknown`.
- `anchors`: normalized `[0..1]` points for model effects.

Anchor names used by the renderer include:

- `nose`
- `tail`
- `fuselageCenter`
- `leftWingTip`
- `rightWingTip`
- `noseUnderside`
- `tailLight`
- `antiCollisionBeacon`
- `leftEngine`
- `rightEngine`
- `propeller`
- `rotorHub`
- `rotorLeftTip`
- `rotorRightTip`
- `tailRotor`
- `contrailLeft`
- `contrailRight`

Each point carries a confidence and source:

- `svg-bounds`: derived from the SVG viewBox / silhouette orientation.
- `type-rule`: inferred from an aircraft-family rule and intentionally marked
  lower confidence.

## Aircraft Reference Data

The renderer does not copy full aircraft datasets into the repo. For aircraft
type and family interpretation, use references only:

- ICAO Aircraft Type Designators, Doc 8643:
  <https://www.icao.int/publications/doc8643>
- Current silhouette source and attribution:
  <https://github.com/RexKramer1/AircraftShapesSVG>
- Three.js SVG-to-shape conversion:
  <https://threejs.org/docs/#examples/en/loaders/SVGLoader>
- Three.js mesh extrusion:
  <https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry>

## Rendering Contract

The 3D overlay is only active in immersive mode. DOM aircraft markers remain
the interaction layer for selection and labels; the Three.js canvas renders the
visual model, lighting, shadows, and contrails with pointer events disabled.

Visual rules:

- Night: strong navigation lights, white tail light, red beacon, stronger rim
  light, softer shadow.
- Dusk/sunset: navigation lights visible but less intense; warm key light.
- Day/morning/afternoon: stronger key light with low-intensity navigation
  lights so the aircraft still reads as powered in immersive mode.
- High altitude contrails: only for immersive aircraft at high altitude and
  sufficient speed.
