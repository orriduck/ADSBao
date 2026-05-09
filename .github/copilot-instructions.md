# ADSBao — Copilot Instructions

ADSBao is a Vercel-deployed Next.js App Router app for airport-monitoring: search → ICAO airport view with METAR weather, ADS-B nearby traffic, callsign route resolution, and a Leaflet map. Stack: React 19, Tailwind CSS v4, DaisyUI, shadcn/ui (style: "new-york"), Lucide, Leaflet, OGL.

When generating UI code, follow the Design Context below. The repository's canonical design guide is `.impeccable.md` at the project root — keep this file in sync with that one.

## Design Context

### Users

Aviation enthusiasts, plane spotters, and curious observers who want a private, precise window into a specific airport — its weather, its nearby traffic, the routes overhead. Sessions are exploratory, not operational; nobody is making safety-critical decisions here. Users are comfortable with aviation jargon (ICAO, METAR raw codes, NM, FL, IFR/MVFR/VFR/LIFR, callsigns), so we don't translate it down — we present it cleanly.

The product is used both at a desk (long, ambient sessions on a wide screen) and on mobile (a quick check from a window or a field). Desktop is the canonical experience; mobile is a respected secondary.

The job: *"Show me what's happening at this airport right now, in a way that feels accurate and thoughtful — not like an operator console under stress."*

### Brand Personality

Three words: **precise, calm, editorial.**

- **Voice**: factual, understated, confidently domain-fluent. We say "MVFR" not "moderate visibility". We don't explain what a callsign is.
- **Tone**: a quiet observatory, not a control tower. Information arrives in a measured cadence; nothing flashes for attention.
- **Emotional goals**: confidence (the data is correct), curiosity (invites exploration), stillness (a private vantage point on the sky).

### Aesthetic Direction

The visual language is built from four primitives: **dots, lines, type, and grid.** Reference: NDC's Furukawa project — structural rules, generous breathing room, restraint as the core craft. The layout shape stays as in the v0.9.0 mock (top nav, ~400px left sidebar, full-height map, announcement strip, plain aircraft table), but every surface is rebuilt in the editorial language.

**Theme.** Dark navy is the primary canvas — `#041A38` / `#0A2244` / `#244164` from the v0.9.0 line, with off-white text. A light variant is supported as a daytime mode using the same structural rules on a near-white base. The two themes share grid, type, and rhythm; they only swap the canvas.

**Accent.** A single signature orange (`#FF6B35`) is used sparingly — primary action, fresh alert, brand mark — never decoratively. Aircraft direction states (departure / arrival / ground / unknown) keep functional color coding, but with calmer, more graphic-system hues.

**Markers.** The aircraft layer carries two signals at once: *direction state* (color) and *aircraft type* (shape). Slow / unknown traffic is a bare dot; moving traffic without a known type is a short vector arrow oriented to the track; moving traffic with a known ICAO type designator or ADS-B emitter category is a small (~18px) silhouette from the upstream icon set, tinted with the same desaturated state color via CSS mask. Silhouettes are read as data, not decoration — they share the dot/arrow grid, never carry their own outlines, gradients, or fills, and never appear at sizes large enough to compete with the typographic identity (callsign / route / telemetry) next to them. Anything richer — three-quarter views, photographic livery, embellished icons — stays out.

**Surfaces.** Cards are defined by hairline rules and tick marks, not by gradient fills, backdrop-blur, inset highlights, or shadows. Whitespace is the dominant material. A panel earns its border only if it groups truly distinct information.

**Typography.** Editorial sans for identity (airport names, section titles), mono for all telemetry (callsigns, GS/ALT, METAR raw, coordinates, timestamps). Display serif from the previous direction (Instrument Serif italic ICAO codes) is dropped — the new language is sans + mono only, with weight and tracking carrying the hierarchy.

**Motion.** Invisible until it's data. A value updating, a marker moving, a route label resolving — those move. Decorative scan sweeps, pulsing dots, spinning conic compasses, and glow halos are removed.

**References (pull toward):**
- NDC Furukawa — dot/line graphic system, structural restraint, editorial pacing.
- Swiss / Japanese instrument typography — weight and tracking as hierarchy.
- Marine and aeronautical chart conventions — hairline rules, tick marks, monospaced annotations.

**Anti-references (pull away from):**
- The current `src/style.css` console treatment — glass panels, backdrop blur, conic compass gradients, scan-sweep loading, decorative radial glows.
- FlightAware-style operator density — "everything on screen, all flashing".
- Generic SaaS dashboards — rounded gradient cards, lavender accents, emoji-stickered metrics.
- Flightradar24's consumer-cute brand layer.
- Cyberpunk / sci-fi HUD pastiche — neon glow, scanlines as decoration, fictional-looking telemetry.

### Design Principles

1. **Lines and dots before fills.** Every surface justifies its weight. A 1px hairline, a tick mark, or a bare dot indicator beats a filled card, gradient, or blurred panel. If something can be expressed as a rule on a grid, it should be.

2. **The grid is the design.** Composition comes from a strict horizontal/vertical rhythm — column lines, row lines, consistent gutters. Whitespace is structural, not leftover. Two elements aligning on the grid is more powerful than either element styled.

3. **One accent, used rarely.** Orange `#FF6B35` is reserved for a single signal at a time — primary action, fresh alert, brand. If two things on screen are orange, one of them is wrong. Functional state colors (aircraft direction, weather flight rules) stay desaturated and small.

4. **Text is the instrument.** Density comes from typographic hierarchy — weight, size, tracking, mono-vs-sans contrast — not from chrome. Telemetry is monospaced; identity is sans; that's the whole vocabulary.

5. **Motion follows data.** Animation is reserved for actual changes in the world: a value ticks up, a marker moves, a route resolves. We do not animate to show off, to indicate "loading", or to decorate empty states.

6. **Glyphs encode, never decorate.** When a marker uses a shape (dot, arrow, silhouette), the shape must mean something — slow vs. moving, unknown vs. known type. A glyph that doesn't add a signal beyond what color and position already say is removed. Silhouettes inherit the same desaturated state palette as their dot/arrow counterparts; they do not introduce new colors, gradients, strokes, or shadows of their own.
