"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Plane } from "lucide-react";
import AirportIdentity from "@/components/sidebar/AirportIdentity";
import PageNavigationDock from "@/components/navigation/PageNavigationDock";
import { MapLoadingFallback } from "@/components/map/MapLoadingOverlay";
import { MECHANISM_ITEMS } from "@/config/mechanism";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const AirportMap = dynamic(() => import("@/components/map/AirportMap"), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

const MECHANISM_AIRPORT = {
  icao: "ZSPD",
  iata: "PVG",
  name: "Shanghai Pudong International Airport",
  localizedName: "上海浦东国际机场",
  city: "Shanghai",
  country: "CN",
  lat: 31.1443,
  lon: 121.8083,
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function buildStagePath(steps) {
  return steps
    .map((step, index) => `${index === 0 ? "M" : "L"} ${step.x} ${step.y}`)
    .join(" ");
}

export default function MechanismPanel() {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const activeItem = MECHANISM_ITEMS[activeIndex] || MECHANISM_ITEMS[0];

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % MECHANISM_ITEMS.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <div className="airport-map-kit airport-map-kit--sidebar-open mechanism-map-kit flex h-dvh overflow-hidden font-sans text-atc-text">
      <PageNavigationDock />

      <aside
        className="airport-desktop-sidebar mechanism-sidebar shrink-0 overflow-hidden"
      >
        <div className="mechanism-sidebar-inner h-full">
          <div className="sidebar-shell airport-sidebar-panel flex h-full flex-col bg-atc-bg">
            <div className="flex-none">
              <AirportIdentity {...MECHANISM_AIRPORT} />
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="dither-section-header flex-none px-6 pt-5 pb-3">
                <div className="endf-section-head">
                  <span className="endf-label">{t("mechanism.sidebarLabel")}</span>
                  <span className="endf-section-head__count">
                    {t("mechanism.count", { count: MECHANISM_ITEMS.length })}
                  </span>
                </div>
              </div>

              <ol className="dither-list px-6 divide-y divide-[var(--atc-line)]">
                {MECHANISM_ITEMS.map((item, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-expanded={active}
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "about-data-source-row group -mx-6 grid w-[calc(100%+3rem)] grid-cols-[max-content_minmax(0,1fr)] items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]",
                          active &&
                            "bg-[color-mix(in_oklab,var(--atc-elev)_72%,transparent)]",
                        )}
                      >
                        <span className="endf-tab endf-tab--code whitespace-nowrap">
                          <span>{String(index + 1).padStart(2, "0")}</span>
                        </span>
                        <span className="min-w-0">
                          <strong className="block whitespace-normal break-words text-[13px] font-semibold leading-snug text-atc-text">
                            {t(item.titleKey)}
                          </strong>
                          <small className="mt-0.5 block whitespace-normal break-words text-[11.5px] leading-snug text-atc-dim">
                            {t(item.signalKey)}
                          </small>
                        </span>
                      </button>

                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none",
                          active
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="px-6 pb-4">
                            <p className="text-[11.5px] leading-relaxed text-atc-dim">
                              {t(item.bodyKey)}
                            </p>
                            <div className="mt-3 grid gap-1.5 border-l border-[var(--atc-line)] pl-3">
                              {item.steps.map((step, stepIndex) => (
                                <div
                                  key={step.key}
                                  className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 text-[10px] leading-tight"
                                >
                                  <span className="font-mono text-atc-faint">
                                    T+{String(stepIndex * 8).padStart(2, "0")}
                                  </span>
                                  <span className="font-semibold text-atc-text">
                                    {t(step.key)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </aside>

      <main className="airport-map-stage relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
        <AirportMap
          icao={MECHANISM_AIRPORT.icao}
          lat={MECHANISM_AIRPORT.lat}
          lon={MECHANISM_AIRPORT.lon}
          zoom={13}
          aircraft={[]}
          nearbyAirports={[]}
          nearbyNavaids={[]}
          airspaces={[]}
          airport={MECHANISM_AIRPORT}
          showMapLabels
          showRunwayBeams={false}
          showNavaidMarkers={false}
          showAirspaces={false}
          floatingSidebarAware
        >
          <MechanismMapOverlay
            activeItem={activeItem}
            activeIndex={activeIndex}
            reducedMotion={reducedMotion}
            t={t}
          />
        </AirportMap>
      </main>
    </div>
  );
}

function MechanismMapOverlay({ activeItem, activeIndex, reducedMotion, t }) {
  const path = buildStagePath(activeItem.steps);
  const plane = activeItem.plane;

  return (
    <div className="pointer-events-none absolute inset-0 z-[var(--z-index-map-panel)]">
      <div className="absolute inset-x-[8%] bottom-[9%] top-[17%] overflow-hidden border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_76%,transparent)] shadow-[var(--app-panel-shadow)]">
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={t("mechanism.stageAria")}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mechanism-map-track" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--atc-accent)" stopOpacity="0.3" />
              <stop offset="1" stopColor="var(--atc-accent)" stopOpacity="0.92" />
            </linearGradient>
          </defs>
          <path
            d="M 10 80 L 30 62 L 50 52 L 72 32 L 90 22"
            fill="none"
            stroke="var(--atc-line-strong)"
            strokeDasharray="1.8 2.6"
            strokeWidth="0.35"
          />
          <path
            key={activeItem.id}
            d={path}
            fill="none"
            stroke="url(#mechanism-map-track)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
            className={cn(
              "transition-opacity duration-300",
              reducedMotion
                ? "opacity-80"
                : "animate-[waves-fade-in_420ms_ease-out_both]",
            )}
          />
          <circle cx="22" cy="68" r="6" fill="var(--atc-accent)" opacity="0.09" />
          <path
            d="M 63 66 L 83 56 L 87 70 L 71 78 Z"
            fill="none"
            stroke="var(--atc-accent)"
            strokeOpacity="0.38"
            strokeWidth="0.45"
          />
        </svg>

        {activeItem.steps.map((step, index) => (
          <div
            key={step.key}
            className="absolute max-w-[140px] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${step.x}%`, top: `${step.y}%` }}
          >
            <span
              className={cn(
                "block size-3 rotate-45 border bg-[var(--atc-bg)] transition-[border-color,background] duration-300 motion-reduce:transition-none",
                index === activeItem.steps.length - 1
                  ? "border-[var(--atc-accent)] bg-[var(--atc-accent)]"
                  : "border-[color-mix(in_oklab,var(--atc-accent)_60%,var(--atc-line))]",
              )}
            />
            <span className="mt-2 block border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_88%,transparent)] px-2 py-1 text-[9px] font-semibold uppercase leading-tight text-atc-text shadow-[var(--app-card-shadow)]">
              {t(step.key)}
            </span>
          </div>
        ))}

        <div
          className="absolute inset-0 transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translate(${plane.x}%, ${plane.y}%)` }}
        >
          <div
            className="grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[color-mix(in_oklab,var(--atc-accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--atc-bg)_86%,transparent)] text-[var(--atc-accent)] shadow-[0_0_28px_color-mix(in_oklab,var(--atc-accent)_22%,transparent)]"
            style={{ rotate: `${plane.rotate}deg` }}
          >
            <Plane aria-hidden="true" className="size-5" />
          </div>
        </div>

        <div className="absolute left-4 top-4 border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_90%,transparent)] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase text-atc-faint">
            {t("mechanism.stageLabel")}
          </p>
          <p className="mt-1 text-[12px] font-bold text-atc-text">
            {t(activeItem.stageKey)}
          </p>
        </div>

        <aside className="absolute right-4 top-4 w-[220px] border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_90%,transparent)] p-4">
          <p className="endf-label">{t("mechanism.traceLabel")}</p>
          <ol className="mt-4 grid gap-3">
            {activeItem.steps.map((step, index) => (
              <li
                key={step.key}
                className="grid grid-cols-[34px_minmax(0,1fr)] items-start gap-3"
              >
                <span className="font-mono text-[10px] text-atc-faint">
                  T+{String(index * 8).padStart(2, "0")}
                </span>
                <span className="text-[12px] font-semibold leading-snug text-atc-text">
                  {t(step.key)}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center justify-between border-t border-[var(--atc-line)] pt-4">
            <span className="text-[10px] font-semibold uppercase text-atc-faint">
              {t("mechanism.sequenceLabel")}
            </span>
            <span className="font-mono text-[11px] text-atc-text">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(MECHANISM_ITEMS.length).padStart(2, "0")}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
