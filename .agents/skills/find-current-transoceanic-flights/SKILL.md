---
name: find-current-transoceanic-flights
description: Use this skill when the user asks to find real current examples of commercial flights crossing oceans, especially for ADS-B, FlightAware, flight tracking, transatlantic, transpacific, or Europe-Asia long-haul validation work.
---

# Find Current Transoceanic Flights

Use this skill for one-time or occasional research runs that need real, currently active commercial flights over oceanic regions for ADS-B or flight-tracking development validation.

Do not start from hardcoded route lists. Discover candidates from current aircraft positions over oceanic regions first, then use FlightAware and Google only for one-time browser research and validation.

Read [references/workflow.md](references/workflow.md) before running the research. The workflow must:

- Discover candidates from current aircraft positions over broad oceanic regions.
- Use FlightAware and Google only to identify and validate the flight.
- Avoid scripts that bulk scrape FlightAware pages.
- Document any real API usage, while still preserving the browser/manual workflow.
- Output a markdown table plus a repeatability section.

Do not implement production app changes. Do not create a scraper.
