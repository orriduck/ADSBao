# FAA Class B Validation Notes

Validation date: 2026-05-07

Source: FAA 28 Day NASR Subscription, current cycle effective 2026-04-16.

Files checked:

- `https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/2026-04-16/`
- `https://nfdc.faa.gov/webContent/28DaySub/2026-04-16/class_airspace_shape_files.zip`

The FAA page lists class airspace definitions as ESRI shape files. The downloaded `Class_Airspace` shapefile is `PolygonZ` and has 5,610 records. The DBF attributes needed for a v1 conversion are present: `IDENT`, `NAME`, `SECTOR`, `CLASS`, `UPPER_VAL`, `UPPER_CODE`, `LOWER_VAL`, and `LOWER_CODE`.

## Airport Checks

| Airport | Class B records | Sectors | Floors MSL | Ceiling MSL | Geometry notes |
|---|---:|---|---|---|---|
| KBOS | 4 | A-D | SFC, 2,000, 3,000, 4,000 | 7,000 | Curved shelves with dense PolygonZ point lists; no repeated sector labels in this sample. |
| KATL | 15 | A-J | SFC, 2,500, 3,000, 3,300, 3,500, 4,000, 5,000, 6,000, 7,000 | 12,500 | Repeated sector labels occur across distinct polygons, for example Area B/H/J. A sector-only key is not stable enough. |
| KSFO | 17 | A-Q | SFC, 1,500, 1,600, 2,100, 2,300, 3,000, 4,000, 5,000, 6,000, 7,000, 8,000 | 10,000 | More sector variety and non-round shelf floors, but still fits the same volume contract. |
| KLAX | 14 | A-N | SFC, 2,000, 2,500, 4,000, 5,000, 6,000, 7,000, 8,000, 9,000 | 10,000 | Compact polygon records with many shelf floors; same model shape works. |

## Contract Decision

A simple `geometry + floorFtMsl + ceilingFtMsl` model works for all four airports as the conversion target. The converter should preserve chart-style labels such as `70/SFC`, `125/25`, or `100/90`, while also storing numeric feet as `floorFtMsl` and `ceilingFtMsl`.

The one extra requirement is a stable source record suffix for generated volume IDs. KATL proves that `airport + class + sector + label` can collide when one sector/label is represented by multiple distinct polygons.

No airport-specific branch is needed for the context model. UI grouping can consume the same `airportContext` contract for KBOS, KATL, KSFO, and KLAX, with official volume matching added later by passing FAA-derived `airspaceVolumes`.
