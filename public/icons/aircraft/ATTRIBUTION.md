# Aircraft silhouette icons

The SVG files in this directory are aircraft silhouettes from
**RexKramer1/AircraftShapesSVG**.

- Source: <https://github.com/RexKramer1/AircraftShapesSVG>
- License: GNU General Public License v3.0 — see [`LICENSE-GPL-3.0.txt`](./LICENSE-GPL-3.0.txt)
- Upstream attribution: built on the work of `tar1090` (wiedehopf) and
  `dump1090` (FlightAware).

## Local changes

- Filenames are lowercased (e.g. `A320.svg` → `a320.svg`) to match the
  resolver convention in `src/utils/aircraftIcon.js`.
- The "fast" variants of `B1`, `TOR`, and `V22` are omitted; the "slow"
  variants ship under the short ICAO designators (`b1.svg`, `tor.svg`,
  `v22.svg`).
- `CVN-65.svg` (the USS Enterprise — a ship, not an aircraft) is omitted.

The SVGs themselves are otherwise unmodified. Any further modifications must
be released under GPL-3.0 per the upstream license. The rest of ADSBao
remains under its MIT license (see project root `LICENSE`); these icons form
a separate license boundary inside the repo.
