# Product

## Register

product

## Users

ADSBao is used by aviation-focused operators, pilots, spotters, and technically fluent enthusiasts who want to read an airport's live operating picture quickly. They are usually comparing weather, runway context, nearby aircraft, route intent, and selected-aircraft detail while keeping the map as the primary working surface.

## Product Purpose

ADSBao provides a map-first airport monitoring HUD: search for an airport, inspect current weather and traffic, and understand how aircraft relate to the field. Success means the interface feels fast, precise, and trustworthy under repeated use, with dense information that remains scannable rather than decorative.

## Brand Personality

Precise, tactile and calm. The interface should feel like a carefully made instrument: neutral materials, shallow relief, legible readings and a single sparingly used accent. Airport terminal signage is not a visual reference.

## Anti-references

Avoid generic SaaS dashboards, marketing hero pages, neon cyberpunk radar tropes, soft pastel consumer UI, busy gacha menu clutter, decorative glassmorphism, airport terminal sign replicas, and purely military simulation aesthetics. Industrial science-fiction can inform tone, but should not become a direct visual source.

## Design Principles

1. Map first: the map remains the visual anchor, and panels should feel attached to the operating surface rather than competing with it.
2. Dense, not cluttered: compress controls and telemetry with strong hierarchy, fixed dimensions, and progressive disclosure.
3. Color restraint: use neutrals for the interface and one warm-gold accent for small action or state cues. Make state readable through labels, shape and relief as well as color.
4. Instrument restraint: use softly rounded groups, thin rims, quiet labels and large readouts. Material stays neutral and shallow; avoid large colored identity panels and provider strips.
5. Preserve flow: visual changes must not change route structure, click paths, data flow, or existing map-layer semantics.
6. Split workspace on large screens: desktop and landscape layouts reserve a real left column for airport context and controls. Preserve that width and the map area. Use inset rounded groups and compact icon tiles inside the column, following DESIGN.md; floating map controls share their soft edge treatment.

## Accessibility & Inclusion

Target WCAG AA contrast for text and controls. Do not encode status by color alone; pair status color with labels, icons, shape, or position where practical. Respect reduced-motion preferences and keep motion short, state-driven, and nonessential.
