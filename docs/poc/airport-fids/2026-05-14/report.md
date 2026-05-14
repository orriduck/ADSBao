# Airport FIDS POC Report

Generated at: 2026-05-14T22:27:08.152Z

| airport | live aircraft | current route calls | current ADB fallback calls | fids calls | matched high | matched medium | unmatched | est call reduction | latency delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| KBOS | 58 | 55 | 15 | 12 | 46 | 0 | 0 | 82.9% | 65ms |
| KJFK | 124 | 122 | 47 | 12 | 26 | 0 | 0 | 92.9% | 239ms |
| KORD | 85 | 85 | 19 | 12 | 29 | 0 | 0 | 88.5% | -27ms |

## KBOS / BOS

Health: schedules OK, live OK, adsb OKPartial
Current path: 44/55 routes matched, 7 multi-leg, 8 missing-target.
FIDS current window: 353 arrivals, 299 departures, 644 deduped flights.
future 24h: 2 windows, 1206 deduped flights, 0 duplicates.
Pagination risk: not-observed.
Latency: current avg 337ms / p95 1204ms, fids avg 272ms / p95 371ms.
Go/No-Go: go.

## KJFK / JFK

Health: schedules OK, live OK, adsb OKPartial
Current path: 69/122 routes matched, 16 multi-leg, 44 missing-target.
FIDS current window: 330 arrivals, 337 departures, 659 deduped flights.
future 24h: 2 windows, 1208 deduped flights, 0 duplicates.
Pagination risk: not-observed.
Latency: current avg 533ms / p95 2168ms, fids avg 294ms / p95 394ms.
Go/No-Go: no-go.

## KORD / ORD

Health: schedules OK, live OK, adsb OKPartial
Current path: 35/85 routes matched, 14 multi-leg, 7 missing-target.
FIDS current window: 799 arrivals, 836 departures, 1595 deduped flights.
future 24h: 2 windows, 2776 deduped flights, 0 duplicates.
Pagination risk: split-window-recommended.
Latency: current avg 309ms / p95 1789ms, fids avg 336ms / p95 460ms.
Go/No-Go: no-go.