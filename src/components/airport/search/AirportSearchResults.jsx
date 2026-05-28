"use client";

import AirportRow from "./AirportRow.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export function AirportSearchResults({
  query,
  rows,
  loading,
  error,
  countLabel,
  onOpen,
}) {
  const { t } = useI18n();

  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="endf-section-head">
          <span className="endf-label">{t("search.searchResults")}</span>
          <span className="endf-section-head__count">{countLabel}</span>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {t("search.searchingAirports")}
        </div>
      ) : error ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {error}
        </div>
      ) : !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {t("search.noAirportMatched", { query: query.trim() })}
        </div>
      ) : (
        <ul className="px-6 divide-y divide-[var(--atc-line)]">
          {rows.map((airport) => (
            <AirportRow
              key={airport.icao || airport.code || airport.name}
              airport={airport}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function FeaturedAirports({
  airports,
  items,
  locationStatus = "idle",
  onRequestLocation,
  onOpen,
}) {
  const { t } = useI18n();
  const displayItems = items || airports.map((airport) => ({ type: "airport", airport }));

  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="endf-section-head">
          <span className="endf-label">{t("search.featuredAirports")}</span>
          <span className="endf-section-head__count">{airports.length}</span>
        </div>
      </div>

      <ul className="px-6 divide-y divide-[var(--atc-line)]">
        {displayItems.map((item, index) =>
          item.type === "location-prompt" ? (
            <LocationPromptRow
              key={item.id}
              status={locationStatus}
              onRequestLocation={onRequestLocation}
            />
          ) : (
            <AirportRow
              key={item.airport.icao}
              airport={item.airport}
              onOpen={onOpen}
              featured={index === 0}
            />
          ),
        )}
      </ul>
    </>
  );
}

function LocationPromptRow({ status, onRequestLocation }) {
  const { t } = useI18n();
  const requesting = status === "requesting";
  const unavailable = status === "unavailable";

  return (
    <li>
      <button
        type="button"
        className="group endf-underline -mx-6 grid w-[calc(100%+3rem)] grid-cols-[72px_minmax(0,1fr)] items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] disabled:cursor-wait"
        disabled={requesting}
        onClick={onRequestLocation}
      >
        <span className="endf-tab endf-tab--code">
          <span>{requesting ? "..." : "LOC"}</span>
        </span>
        <span className="min-w-0">
          <strong className="endf-row-title block truncate text-atc-text">
            {requesting
              ? t("search.locationRequesting")
              : t("search.locationPrompt")}
          </strong>
          <small className="endf-row-subtitle mt-0.5 block truncate text-atc-dim">
            {unavailable
              ? t("search.locationUnavailable")
              : t("search.locationPromptHint")}
          </small>
        </span>
      </button>
    </li>
  );
}
