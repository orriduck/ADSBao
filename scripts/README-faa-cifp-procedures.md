# FAA CIFP Procedure Pipeline

This builder converts a local FAA CIFP `FAACIFP18` file into ADSBao-owned static procedure artifacts under `public/data/procedures`.

Source data:

- FAA CIFP download page: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/
- FAA publishes CIFP as raw ARINC 424 data and updates it every 28 days.

Generate the KBOS MVP overlay:

```bash
node scripts/build-faa-cifp-procedures.js \
  --input ./data/raw/FAACIFP18 \
  --airport KBOS \
  --procedure R04R \
  --cycle 260514
```

`--input` may point to `FAACIFP18`, a directory containing `FAACIFP18`, or a CIFP zip. The script writes:

```text
public/data/procedures/US/KBOS/index.json
public/data/procedures/US/KBOS/approaches/<procedure-id>.geojson
```

MVP support:

- Supported path terminators: `IF`, `TF`, `DF`, `CF`
- Unsupported path terminators are preserved in leg metadata and emitted as warnings.
- Known unsupported first-pass geometry: `RF`, `AF`, `HM`, `HA`, `HF`, holds, procedure turns, and curved missed approach details.

Validation:

1. Generate the selected KBOS approach.
2. Compare fix order and rough line shape against the matching FAA d-TPP approach PDF.
3. Confirm the frontend loads the generated GeoJSON from `public/` without fetching FAA data during render.

The generated overlay is informational visualization only and is not for navigation.
