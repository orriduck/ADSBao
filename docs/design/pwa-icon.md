# ADSBao PWA icon — 2026-09-05

The user requested a newly generated logo and replacement of the current PWA icon, then explicitly selected the first generation's dimensional lighting and soft glow. The selected mark pairs a detailed ivory civilian aircraft with a softly lit flight-path arc and one warm-gold position dot on charcoal. It represents live flight tracking and geographic context. The selected logo treatment is specific to the app identity; interface surfaces retain `DESIGN.md`.

## Assets

Generated with the built-in imagegen tool, then exported to the required PNG sizes with macOS `sips`. The final generated image was inspected before use. No API credentials or new image library were required.

| File | Size | Use |
| --- | --- | --- |
| `public/brand/adsbao-logo.78f3075809.png` | 1024×1024 | Shared brand source |
| `public/icon.dc66b6460f.png` | 512×512 | PWA any/maskable and browser notification icon |
| `public/icon-192.3cad36b29d.png` | 192×192 | PWA and large favicon |
| `public/apple-icon.adb324f783.png` | 180×180 | Apple Touch icon |
| `public/favicon-32.aff2b8f11b.png` | 32×32 | Browser favicon |

All exports are opaque and retain the full square background; the platform applies its own outer mask. The three unused, superseded SVG marks were removed after confirming no repository references. All icon URLs and the manifest URL include a content hash, and `BrandLogo`, notification defaults and document links use those URLs. The service worker reloads its precache from the network during installation and reads only its current cache. Registration bypasses the HTTP cache for worker updates and also runs when the page has already loaded. Manifest identity, start URL, app theme and browser-local preferences remain unchanged.

## Generation prompt and refinement

Initial direction: one square production icon for a noncommercial, map-first aviation app; an upper-right passenger aircraft, open flight-path arc and one muted gold position dot; charcoal, ivory, gray and warm gold; no words, mascot, blue, radar grid or mockup. The user's selected first design preserves cockpit windows, engine/wing details, subtle fuselage shading and a soft halo. Its transparent background was filled for PWA use.

Exact final image-edit prompt, applied to the inspected first generation:

> The user has selected THIS first design exactly because of its soft luminous, dimensional effect and detailed airplane. Make a minimal production background edit only. Preserve the original airplane's exact appearance, cockpit windows, fuselage shading, wing details, engine details, diagonal orientation, original size, circular flight-path arc, golden dot, soft halo/glow and dimensional lighting. Do NOT simplify, flatten, redesign, enlarge or reposition the artwork. Fill ONLY the transparent background/transparent areas with a full-bleed opaque very dark charcoal (#222221) square, smoothly retaining the existing halo over it. Preserve the first design's softly lit premium sculptural feel. No added text, no new elements, no rounded outer canvas corners, no transparent pixels. The result must look like this same first image on an opaque charcoal app-icon background.

## Validation

- The browser [review page](pwa-icon-review.html) reads the actual project PNGs at 16, 32, 48, 64 and 128 CSS pixels, on light and dark surfaces, with rounded and circular masks plus the 80% safe-zone crop.
- `sips` verified the dimensions above and no alpha channel. Browser image elements loaded their expected native dimensions.
- Rechecked the user's selected first-effect export on the review page: the aircraft, path and gold point remain inside the safe crop, with the selected glow visible at home-screen sizes. Both light and dark background samples loaded successfully.
- Current typecheck, changed-file lint, PWA policy/changelog checks and production build passed. Verified manifest dimensions against PNG headers, HTTP and built bytes against the source files, inclusion of every icon in precache, and that swapping only icon content produces a different cache revision. The build retains its existing chunk-size advisory.
- Maskable layout follows the opaque-background and centered 80%-diameter safe-zone guidance in [MDN's app-icon documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons), checked 2026-09-05.
- This verifies local assets and browser rendering, not an installed physical-device home screen or a production release. Existing installed launchers can refresh their icon separately from the page assets.

## Cache migration correction (3.20.1)

After 3.20.0 deployed successfully, production asset bytes matched the new logo while an existing browser session still displayed the old tower at the stable icon URL. The exact cache layer could not be inspected through the browser tooling. Content-addressed icon and manifest URLs prevent that old URL entry from serving the current app identity assets. Regression checks execute the generated worker, verify current-cache lookup and network-reloaded installation, and check asset content hashes and manifest dimensions. Installed operating-system launchers may update separately; browser validation does not establish a physical-device launcher refresh.
