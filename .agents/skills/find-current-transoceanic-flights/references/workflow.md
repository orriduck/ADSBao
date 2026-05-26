# Workflow

This workflow finds live commercial transoceanic examples for ADS-B and flight-tracking development. It is time-sensitive research, not permanent fixture data.

## 1. Discovery

Start from live aircraft positions over broad oceanic regions, not airport pairs.

Scan these regions:

- North Atlantic
- North Pacific
- Central Pacific
- Indian Ocean
- Arabian Sea
- Bay of Bengal

Use a live aircraft map or current position data source that can show aircraft over water. Candidate aircraft should already be over water or clearly in an oceanic corridor. Prefer high-altitude airline traffic.

Do not begin with known long-haul city pairs, airline schedules, saved sample flights, or hardcoded route lists. The first evidence should be a current aircraft position.

## 2. Candidate filtering

Keep candidates only if they meet the core requirements:

- Currently airborne, active, or en route.
- Current position is over ocean or clearly in an oceanic corridor.
- Commercial airline flight, not a private jet.

Prefer candidates with:

- Altitude >= 28,000 ft.
- Ground speed >= 350 kt.
- Widebody or long-haul aircraft type: B777, B787, A330, A350, A380, B767, or B747.

Narrowbody flights are acceptable only if clearly commercial and clearly over ocean, but rank them lower than widebody or long-haul aircraft.

## 3. Validation

For each candidate:

1. Resolve the callsign or flight number from the live aircraft source.
2. Use FlightAware and/or Google to identify:
   - Airline
   - Origin
   - Destination
   - Aircraft type
   - Status
   - Current position
   - Altitude
   - Speed
3. Confirm the live map or current position is over an oceanic region.
4. Keep FlightAware links for human verification.
5. If evidence is ambiguous, lower confidence or reject the candidate.

FlightAware and Google are allowed for one-time browser research and validation. Do not write scripts that bulk scrape FlightAware pages.

If a real API is available, it may be used when it respects source terms and rate limits, but the browser/manual workflow must still be documented so a human or future Codex run can repeat the research.

## 4. Output

Produce a markdown table:

| confidence | ocean region | flight | airline | origin | destination | aircraft | altitude | speed | current position evidence | FlightAware URL |
|---|---|---|---|---|---|---|---:|---:|---|---|

Then include:

- Why each flight qualifies.
- How to repeat this.
- Which live map or data source was used.
- Which ocean region was scanned.
- Which search queries worked.
- False positives rejected and why.

## 5. Repeatability rules

The repeatability requirement means documenting the browser or data workflow clearly enough that another Codex run or human can repeat it later.

It does not mean writing a FlightAware scraper.

Do not store today's example flights as permanent truth, because the examples are time-sensitive.
