"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  airportDisplayCode,
  airportDisplayName,
  airportSubtitle,
} from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";
import gsap from "gsap";
import { MOTION, EASE } from "@/animations/gsap";

export default function AirportDiscoveryPanel({ topics = [], onOpen }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      // 1. Sections stagger in
      const sections = container.querySelectorAll("section");
      gsap.fromTo(
        sections,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION.med,
          ease: EASE.out,
          stagger: { each: 0.08, from: "start" },
          overwrite: "auto",
        },
      );

      // 2. List items stagger in after sections
      const rows = container.querySelectorAll("li");
      gsap.fromTo(
        rows,
        { opacity: 0, x: -6 },
        {
          opacity: 1,
          x: 0,
          duration: MOTION.med,
          ease: EASE.out,
          stagger: { each: 0.04, from: "start" },
          overwrite: "auto",
        },
      );
    }, container);

    return () => ctx.revert();
  }, [topics.length]);

  return (
    <div ref={containerRef} className="flex flex-col gap-5 px-6 pb-7">
      <NearMeDiscoverySection />

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

// Single-row entry into the `/here` view. Replaces the older in-page
// "request location → render nearby airport list" flow — the user can
// still pick a specific airport from the topic sections below, but the
// nearby button now sends them into the user-centered explorer page.
function NearMeDiscoverySection() {
  const { locale, t } = useI18n();
  const router = useRouter();

  const handleOpenNearMe = () => {
    router.push(setLocaleSearchParam("/here", "", locale));
  };

  return (
    <section className="min-w-0" aria-labelledby="airport-discovery-nearby">
      <DiscoverySectionHeader
        id="airport-discovery-nearby"
        title={t("search.discovery.nearby.title")}
      />
      <ul className="mt-3 divide-y divide-[var(--atc-line)] border-y border-[var(--atc-line)]">
        <NearbyPromptRow onRequest={handleOpenNearMe} />
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

function NearbyPromptRow({ onRequest }: { onRequest: () => void }) {
  const { t } = useI18n();
  const title = t("search.discovery.nearby.cta");
  const hint = t("search.discovery.nearby.ctaHint");

  return (
    <li>
      <button
        type="button"
        className="group endf-underline -mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[62px_minmax(0,1fr)_16px] items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]"
        onClick={onRequest}
      >
        <span className="endf-tab endf-tab--code whitespace-nowrap">
          <span>HERE</span>
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
        className="group endf-underline -mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[62px_minmax(0,1fr)_16px] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atc-accent/60"
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
