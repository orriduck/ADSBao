import { useEffect, useRef, type CSSProperties } from "react";
import { ChevronRight, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AirportListRow } from "./AirportListRow";
import {
  airportDirectoryCode,
  airportDisplayName,
  airportSubtitle,
} from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { setLocaleSearchParam } from "@/features/app-shell/i18n/i18nModel";
import { requestNearMeDeviceOrientationPermission } from "@/features/airport/nearby/nearMeLocationModel";

const PREFETCH_INTENT_DELAY_MS = 120;

export default function AirportDiscoveryPanel({
  topics = [],
  onOpen,
  onPrefetch,
}) {
  return (
    <div className="dither-content-stack flex flex-col">
      <NearMeDiscoverySection />

      {topics.map((topic, topicIndex) => (
        <AirportDiscoveryTopicSection
          key={topic.id}
          topic={topic}
          motionBase={topicIndex * 3 + 1}
          onOpen={onOpen}
          onPrefetch={onPrefetch}
        />
      ))}
    </div>
  );
}

// Single-row entry into the `/here` view. Replaces the older in-page
// "request location → render nearby airport list" flow — the user can
// still pick a specific airport from the topic sections below, but the
// nearby button now sends them into the user-centered explorer page.
function NearMeDiscoverySection() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();

  const handleOpenNearMe = () => {
    void requestNearMeDeviceOrientationPermission().finally(() => {
      navigate(setLocaleSearchParam("/here", "", locale));
    });
  };

  return (
    <section
      className="airport-discovery-topic airport-discovery-topic--nearby dither-section-flow min-w-0"
      aria-labelledby="airport-discovery-nearby"
    >
      <h2 id="airport-discovery-nearby" className="sr-only">
        {t("search.discovery.nearby.title")}
      </h2>
      <ul className="dither-list mt-2 flex flex-col gap-1">
        <NearbyPromptRow
          label={t("search.discovery.nearby.title")}
          onRequest={handleOpenNearMe}
        />
      </ul>
    </section>
  );
}

function AirportDiscoveryTopicSection({ topic, motionBase, onOpen, onPrefetch }) {
  const { t } = useI18n();

  return (
    <section
      className={`airport-discovery-topic airport-discovery-topic--${topic.id} dither-section-flow min-w-0`}
      aria-labelledby={`airport-discovery-${topic.id}`}
    >
      <h2 id={`airport-discovery-${topic.id}`} className="sr-only">
        {t(topic.titleKey)}
      </h2>

      <ul className="dither-list mt-2 flex flex-col gap-1">
        {topic.airports.map((airport, index) => (
          <AirportDiscoveryAirportRow
            key={airport.icao || airport.code || airport.name}
            airport={airport}
            label={index === 0 ? t(topic.titleKey) : undefined}
            motionOrder={motionBase + index}
            onOpen={onOpen}
            onPrefetch={onPrefetch}
          />
        ))}
      </ul>
    </section>
  );
}

function NearbyPromptRow({
  label,
  onRequest,
}: {
  label: string;
  onRequest: () => void;
}) {
  const { t } = useI18n();
  const title = t("search.discovery.nearby.cta");
  const hint = t("search.discovery.nearby.ctaHint");

  return (
    <li>
      <AirportListRow
        as="button"
        onClick={onRequest}
        className="airport-list-row--nearby"
        pill={<Navigation className="airport-list-row__rail-icon" aria-hidden="true" />}
        railMotionKind="navigation"
        label={label}
        title={title}
        subtitle={hint}
        trailing={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
      />
    </li>
  );
}

function AirportDiscoveryAirportRow({
  airport,
  label,
  motionOrder,
  onOpen,
  onPrefetch,
}) {
  const { locale } = useI18n();
  const code = airportDirectoryCode(airport);
  const prefetchTimerRef = useRef<number | null>(null);

  const cancelPrefetch = () => {
    if (prefetchTimerRef.current == null) return;
    window.clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  };

  const schedulePrefetch = () => {
    cancelPrefetch();
    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      onPrefetch?.(airport);
    }, PREFETCH_INTENT_DELAY_MS);
  };

  useEffect(() => cancelPrefetch, [airport, onPrefetch]);

  return (
    <li
      style={{
        "--rail-motion-delay": `${28 + motionOrder * 18}ms`,
      } as CSSProperties}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
      onFocus={schedulePrefetch}
      onBlur={cancelPrefetch}
      onMouseDown={cancelPrefetch}
    >
      <AirportListRow
        as="button"
        className="airport-list-row--directory"
        onClick={() => onOpen(airport)}
        pill={code}
        railMotionKind="code"
        label={label}
        title={airportDisplayName(airport, locale)}
        subtitle={airportSubtitle(airport, locale)}
        trailing={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
      />
    </li>
  );
}
