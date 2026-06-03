# Regional Aeronautical Data Candidates

Status: technical reserve, not an implementation ticket yet  
Last checked: 2026-06-02

This page tracks candidate non-US data sources for future ADSBao navigation reference layers, especially waypoints, navaids, ATS routes, and FIR/airspace context.

The goal is not to build a certified navigation product. ADSBao should treat these layers as visual/reference context only and label them clearly as not for navigation.

## Baseline: United States

### FAA CIFP

Source: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/

FAA CIFP is the strongest baseline for a structured official source. It is raw ARINC 424 data and FAA says it can support both en route and terminal GPS navigation. It is updated every 28 days.

Potential ADSBao use:

- Parse ARINC 424 into normalized navpoints, navaids, procedures, and route references.
- Use the FAA cycle/effective date as first-class metadata.
- Keep this as the first real implementation target for an official navpoint/route layer.

### FAA NASR

Source: https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/

NASR is the companion aeronautical-data subscription with 28-day effective-cycle downloads. It is useful for airports, navaids, fixes/reporting points, and other NAS metadata.

Potential ADSBao use:

- Use NASR for airport/navaid/fix metadata that is simpler to consume than CIFP.
- Cross-check CIFP-derived entities against NASR where possible.

## Europe candidate: EUROCONTROL EAD

Source: https://www.eurocontrol.int/service/european-ais-database

EUROCONTROL EAD is the strongest Europe candidate. EUROCONTROL describes EAD as a centralized reference database of quality-assured aeronautical information that allows users to retrieve and download AIS data. It covers ECAC and ECAC+ data including AIPs, charts, and en-route information such as airspace, routes, navaids, and waypoints.

Why it is interesting:

- It is official/operationally aligned, not a hobby dataset.
- It is regionally centralized for Europe instead of one-country-at-a-time scraping.
- EAD uses AIXM as the backbone of its static data model and supports AIXM downloads.
- It has data-download and B2B access modes, which are closer to a real data pipeline than scraping PDFs.

Access/licensing notes:

- EAD Basic is free but limited, for general purposes only, and not for operational use.
- Production-style access appears to require an EAD agreement.
- Charges and royalty fees can apply depending on client type and commercialisation.
- Do not implement ADSBao integration until terms, redistribution rights, and cost are confirmed.

Candidate spike:

1. Create an EAD Basic account and inspect AIP/PAMS/ENR content manually.
2. Confirm whether EAD Basic is only useful for human lookup or whether it exposes stable downloadable artifacts.
3. If structured data is needed, investigate EAD SDO static data download or MyEAD B2B access.
4. Record whether EAD can provide routes, navaids, and waypoints as AIXM 5.1 baseline/permdelta data.
5. Treat this as a future official Europe source, not a near-term free source.

Recommendation: keep as the preferred Europe candidate, but do not assume it is free or redistributable.

## Asia candidate: Singapore AIM-SG

Source: https://aim-sg.caas.gov.sg/  
AIP page: https://aim-sg.caas.gov.sg/aip/

Singapore AIM-SG is the most practical Asia-side spike candidate found so far. It is an official Singapore government aviation portal. The public portal exposes AIP, AIP amendments, AIP supplements, AIC, NOTAM list, eTOD/AMD, and ADC information for the Singapore FIR. The AIP page says Singapore AIP contains GEN, ENR, and AD parts and is updated regularly, with AIP amendments issued once every two months.

Why it is interesting:

- Official .gov.sg source.
- Public AIP is available in HTML/PDF.
- Singapore FIR is small enough for a parser spike but still aviation-real, not toy data.
- ENR sections should be useful for testing extraction of ATS routes, navaids, reporting points/name-code designators, and FIR context.

Limitations:

- It is Singapore FIR only, not Asia-wide.
- It is not equivalent to FAA CIFP/NASR as a ready-made structured bulk dataset.
- Source format appears to be AIP/eAIP HTML/PDF, so parsing will be more brittle than ARINC/AIXM ingestion.
- Terms and redistribution permissions must be checked before using data in production.

Candidate spike:

1. Fetch the current AIM-SG AIP HTML/PDF package.
2. Inspect ENR 3 and ENR 4 sections.
3. Prototype extraction for:
   - ATS route segments
   - name-code designators / waypoints
   - navaids
   - FIR boundary/reference metadata
4. Normalize into the same `nav_points`, `navaids`, and `airways` model planned for FAA.
5. Keep `source = "aim-sg"`, `region = "WSSS-FIR"`, `cycle/effective_date`, and source URL on every imported row.
6. Do not expose a bulk data API until license/terms are confirmed.

Recommendation: use AIM-SG as the first Asia parser spike, not as the final Asia-wide source.

## Asia alternates to keep in mind

### Japan AIS

Source: https://aisjapan.mlit.go.jp/

Japan AIS is official and states that it provides aeronautical information produced by the Japan AIS Center under national regulations and ICAO Annex 15. It may be a better regional candidate than Singapore in terms of airspace size, but access requires account/login, so it is less convenient for a quick parser spike.

Candidate use: revisit after AIM-SG if an account can be created and terms permit non-operational reference usage.

### Hong Kong AIS

Source: https://www.ais.gov.hk/

Hong Kong AIS has public eAIP/AIP PDF, but the site terms say the products are controlled documents and that reproduction, adaptation, distribution, dissemination, or making copyright works available to the public is prohibited unless prior written authorization is obtained from CAD.

Candidate use: reference only. Do not ingest into ADSBao without authorization.

## Implementation guidance for ADSBao

Use a source-first schema so licensing and freshness do not become soup:

```ts
type NavPoint = {
  id: string;
  ident: string;
  name?: string | null;
  lat: number;
  lon: number;
  region?: string | null;
  airport?: string | null;
  usage?: "ENROUTE" | "TERMINAL" | "VFR" | "UNKNOWN";
  source: "faa-cifp" | "faa-nasr" | "ead" | "aim-sg" | "ais-japan" | "manual";
  sourceUrl?: string | null;
  cycle?: string | null;
  effectiveDate?: string | null;
  validUntil?: string | null;
  accessState?: "open" | "registration" | "agreement-required" | "restricted" | "unknown";
};
```

Do not use `ident` alone as a primary key. Waypoint identifiers repeat globally. Use a compound identity such as `source + region + ident + airport/usage`.

## Product/UI guidance

- Label the layer as `Navigation reference` or `Nearby aviation references`.
- Always show `not for navigation` somewhere near the layer toggle or about page.
- Show source and effective cycle/date when available.
- Do not use SkyVector tiles or scraped SkyVector data.
- Do not use stale GitHub waypoint datasets as a primary source.
- Avoid mixing restricted/unclear-license sources into an open redistributable database.

## Near-term recommendation

1. Implement US first with FAA CIFP/NASR.
2. Keep EUROCONTROL EAD as the preferred official Europe candidate, pending agreement/access/cost.
3. Use Singapore AIM-SG as a small, official Asia eAIP parser spike.
4. Revisit Japan AIS after confirming account access and terms.
