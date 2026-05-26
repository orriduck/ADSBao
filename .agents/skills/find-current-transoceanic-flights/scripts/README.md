# Scripts

Scripts are intentionally not implemented by default because this skill is mainly a browser/data research workflow.

If a future API-backed implementation is added, it should:

- Respect source terms and rate limits.
- Use official APIs where available.
- Avoid scraping FlightAware pages.
- Query current aircraft position sources by oceanic region or bounding box.
- Deduplicate by aircraft hex/callsign.
- Produce the same markdown report format.
