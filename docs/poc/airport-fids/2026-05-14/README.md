# Airport FIDS POC Artifacts

Generated at: 2026-05-14T22:27:08.152Z

Files per airport:
- `live-aircraft.raw.json`: raw adsb.lol snapshot used in the run
- `airport-fids-current.raw.json`: raw AeroDataBox current-window response
- `airport-fids-current.flat.json`: flattened/deduped FIDS flights used for matching
- `match-table.json|csv|md`: aircraft-to-FIDS match table with identifier agreement columns
- `current-route-lookups.json`: per-callsign current-path lookup details

## KBOS
- live aircraft: 58
- current-path calls: 70
- fids calls: 12
- match summary: high 46, medium 0, low 12, unmatched 0

## KJFK
- live aircraft: 124
- current-path calls: 169
- fids calls: 12
- match summary: high 26, medium 0, low 98, unmatched 0

## KORD
- live aircraft: 85
- current-path calls: 104
- fids calls: 12
- match summary: high 29, medium 0, low 56, unmatched 0

