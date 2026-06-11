"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { TextPillListItem } from "@/components/ui/TextPillListItem";
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
      if (sections.length > 0) {
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
      }

      // 2. List items stagger in after sections
      const rows = container.querySelectorAll("li");
      if (rows.length > 0) {
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
      }
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
      <ul className="mt-3 flex flex-col gap-1">
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

      <ul className="mt-3 flex flex-col gap-1">
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
      <TextPillListItem
        as="button"
        onClick={onRequest}
        pill="HERE"
        title={title}
        subtitle={hint}
        trailing={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
      />
    </li>
  );
}

function AirportDiscoveryAirportRow({ airport, onOpen }) {
  const { locale, t } = useI18n();
  const code = airportDisplayCode(airport);
  const label = airport.discoveryLabelKey ? t(airport.discoveryLabelKey) : "";

  return (
    <li>
      <TextPillListItem
        as="button"
        onClick={() => onOpen(airport)}
        pill={code}
        title={airportDisplayName(airport, locale)}
        subtitle={label || airportSubtitle(airport, locale)}
        trailing={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
      />
    </li>
  );
}
