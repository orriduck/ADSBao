"use client";

import {
  ChevronRight,
  LocateFixed,
} from "lucide-react";
import {
  airportDisplayCode,
  airportDisplayName,
  airportSubtitle,
} from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useAirportDiscoveryNearby } from "@/features/airport/search/useAirportDiscoveryNearby";
import {
  getNearbyAirportDisplayItems,
} from "@/features/airport/search/airportSearchModel";

export default function AirportDiscoveryPanel({ topics = [], onOpen }) {
  const nearby = useAirportDiscoveryNearby();

  return (
    <div className="flex flex-col gap-5 px-6 pb-7">
      <NearbyAirportDiscoverySection nearby={nearby} onOpen={onOpen} />

      <div className="flex flex-col gap-5">
        {topics.map((topic) => (
          <AirportDiscoveryTopicSection
            key={topic.id}
            topic={topic}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function NearbyAirportDiscoverySection({ nearby, onOpen }) {
  const { t } = useI18n();
  const items = getNearbyAirportDisplayItems({
    airports: nearby.airports,
    status: nearby.status,
    errorMessage: nearby.errorMessage,
  });

  return (
    <section className="min-w-0" aria-labelledby="airport-discovery-nearby">
      <DiscoverySectionHeader
        id="airport-discovery-nearby"
        title={t("search.discovery.nearby.title")}
      />

      <ul className="mt-3 divide-y divide-[var(--atc-line)] border-y border-[var(--atc-line)]">
        {items.map((item) => {
          if (item.type === "airport") {
            return (
              <AirportDiscoveryAirportRow
                key={item.airport.icao || item.airport.code || item.airport.name}
                airport={item.airport}
                onOpen={onOpen}
              />
            );
          }
          if (item.type === "nearby-empty") {
            return (
              <li
                key={item.id}
                className="px-1 py-4 text-[12px] leading-relaxed text-atc-dim"
              >
                {t("search.discovery.nearby.empty")}
              </li>
            );
          }
          return (
            <NearbyPromptRow
              key={item.id}
              status={item.status}
              errorMessage={item.errorMessage}
              onRequest={nearby.requestNearbyAirports}
            />
          );
        })}
      </ul>
    </section>
  );
}

function AirportDiscoveryTopicSection({ topic, onOpen }) {
  const { t } = useI18n();

  return (
    <section className="min-w-0" aria-labelledby={`airport-discovery-${topic.id}`}>
      <DiscoverySectionHeader
        id={`airport-discovery-${topic.id}`}
        title={t(topic.titleKey)}
        description={t(topic.descriptionKey)}
      />

      <ul className="mt-3 divide-y divide-[var(--atc-line)] border-y border-[var(--atc-line)]">
        {topic.airports.map((airport) => (
          <AirportDiscoveryAirportRow
            key={airport.icao || airport.code || airport.name}
            airport={airport}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}

function DiscoverySectionHeader({
  id,
  title,
  description = "",
}) {
  return (
    <header className="min-w-0">
      <h2
        id={id}
        className="truncate text-[15px] font-extrabold leading-tight text-atc-text"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-[12px] leading-relaxed text-atc-dim">
          {description}
        </p>
      ) : null}
    </header>
  );
}

function NearbyPromptRow({ status, errorMessage, onRequest }) {
  const { t } = useI18n();
  const busy = status === "requesting" || status === "loading";
  const unavailable = status === "unavailable";
  const title = busy
    ? t(
        status === "loading"
          ? "search.discovery.nearby.loading"
          : "search.discovery.nearby.requesting",
      )
    : unavailable
      ? t("search.discovery.nearby.retry")
      : t("search.discovery.nearby.cta");
  const hint = unavailable
    ? errorMessage || t("search.discovery.nearby.unavailable")
    : t("search.discovery.nearby.ctaHint");

  return (
    <li>
      <button
        type="button"
        className="group -mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[42px_minmax(0,1fr)_16px] items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] disabled:cursor-wait disabled:opacity-75"
        disabled={busy}
        onClick={onRequest}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--atc-click-bg)] text-[var(--atc-click-fg)] shadow-[inset_0_-8px_14px_color-mix(in_oklab,var(--atc-click-fg)_9%,transparent)]">
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[13px] font-semibold text-atc-text">
            {title}
          </strong>
          <small className="mt-0.5 block text-[11.5px] leading-snug text-atc-dim">
            {hint}
          </small>
        </span>
        <ChevronRight
          className="h-4 w-4 text-atc-faint transition-transform group-hover:translate-x-0.5 group-hover:text-atc-text"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

function AirportDiscoveryAirportRow({ airport, onOpen }) {
  const { locale, t } = useI18n();
  const code = airportDisplayCode(airport);
  const label = airport.discoveryLabelKey ? t(airport.discoveryLabelKey) : "";

  return (
    <li>
      <button
        type="button"
        className="group -mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[62px_minmax(0,1fr)_16px] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atc-accent/60"
        onClick={() => onOpen(airport)}
      >
        <span className="endf-tab endf-tab--code">
          <span>{code}</span>
        </span>
        <span className="min-w-0">
          <strong className="block min-w-0 truncate text-[13px] font-semibold text-atc-text">
            {airportDisplayName(airport, locale)}
          </strong>
          <small className="mt-0.5 block truncate text-[11.5px] text-atc-dim">
            {label || airportSubtitle(airport, locale)}
          </small>
        </span>
        <ChevronRight
          className="h-4 w-4 text-atc-faint transition-transform group-hover:translate-x-0.5 group-hover:text-atc-text"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}
