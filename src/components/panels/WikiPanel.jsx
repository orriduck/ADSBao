"use client";

import PanelHeading from "./PanelHeading.jsx";

export default function WikiPanel({
  wikiSummary,
  wikiLoading = false,
  airportName = "Airport",
}) {
  const wikiLink = wikiSummary?.url ? (
    <a
      className="panel-link"
      href={wikiSummary.url}
      target="_blank"
      rel="noreferrer"
    >
      Wikipedia
    </a>
  ) : null;

  return (
    <section className="glass-panel wiki-panel">
      <PanelHeading
        kicker="Airport wiki"
        title={wikiSummary?.title || airportName}
        action={wikiLink}
      />

      <p className="wiki-copy">
        {wikiSummary?.extract
          ? wikiSummary.extract
          : wikiLoading
            ? "Loading airport introduction..."
            : "No Wikipedia summary was found for this airport. The rest of the dashboard remains live."}
      </p>

      <div className="wiki-source">Source: Wikipedia summary API</div>
    </section>
  );
}
