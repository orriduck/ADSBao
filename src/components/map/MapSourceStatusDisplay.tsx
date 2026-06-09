"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MOTION, EASE } from "@/animations/gsap";
import { cn } from "@/lib/utils";

const rootClassName =
  "flex min-w-0 flex-col items-end justify-center gap-px whitespace-nowrap font-display [font-feature-settings:'tnum'_1] [text-shadow:0_1px_8px_var(--atc-bg)]";

const mapCornerClassName = cn(
  "absolute right-3 top-[calc(100%+6px)] hidden max-w-[calc(100vw-72px)] transform-none",
  "[.airport-map-menu_&]:flex",
  "[.airport-map-kit_&]:right-0.5 [.airport-map-kit_&]:top-[calc(100%+10px)]",
  "md:[.airport-map-kit_&]:top-[calc(100%+8px)]",
  "[.airport-map-menu--mobile_&]:left-1/2 [.airport-map-menu--mobile_&]:right-auto [.airport-map-menu--mobile_&]:top-[calc(100%+7px)]",
  "[.airport-map-menu--mobile_&]:bottom-[calc(100%+7px)] [.airport-map-menu--mobile_&]:top-auto",
  "[.airport-map-menu--mobile_&]:max-w-[min(360px,calc(100vw-16px))] [.airport-map-menu--mobile_&]:-translate-x-1/2",
  "[.airport-map-menu--mobile_&]:items-center [.airport-map-menu--mobile_&]:text-center",
  "[.airport-map-menu--mobile_&]:[filter:drop-shadow(0_7px_11px_color-mix(in_oklab,var(--atc-bg)_72%,transparent))_drop-shadow(0_1px_1px_color-mix(in_oklab,var(--atc-text)_24%,transparent))]",
);

const lineClassName = cn(
  "flex w-full min-w-0 items-center justify-end gap-[7px]",
  "text-[10px] font-semibold leading-none text-atc-dim",
  "[.airport-map-kit_&]:gap-[5px] [.airport-map-kit_&]:text-[8px]",
  "[.airport-map-menu--mobile_&]:justify-center [.airport-map-menu--mobile_&]:gap-1.5",
  "[.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[9px]",
);

const diamondClassName =
  "inline-block size-[7px] flex-none rotate-45 bg-atc-orange [.airport-map-kit_&]:size-[5px] [.airport-map-menu--mobile_&]:size-1.5";

const loadingClassName = cn(
  "min-h-0 max-w-[min(360px,calc(100vw-72px))] overflow-hidden whitespace-normal",
  "text-right font-mono text-[8px] font-semibold uppercase leading-none text-atc-dim",
  "opacity-0 transition-opacity duration-200 ease-out [overflow-wrap:anywhere] will-change-[opacity] motion-reduce:transition-none",
  "[.airport-map-kit_&]:max-w-[min(320px,calc(100vw-72px))] [.airport-map-kit_&]:text-[7px]",
  "[.airport-map-menu--mobile_&]:max-w-[min(360px,calc(100vw-16px))] [.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[7px]",
);

/**
 * Inline span with GSAP fade transition when content changes.
 */
function StatusSpan({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(children);

  useLayoutEffect(() => {
    if (prevRef.current === children) return;
    prevRef.current = children;
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 2 },
      { opacity: 1, y: 0, duration: MOTION.fast, ease: EASE.out, overwrite: "auto" },
    );
  }, [children]);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

export default function MapSourceStatusDisplay({
  feedSource = "",
  feedStatus = "live",
  updatedLabel = "",
  routeProviderLabel = "",
  loadingStatus = "",
  placement = "mobile-map",
  wakeLockActive = false,
}) {
  const loadingActive = Boolean(loadingStatus);
  const [displayedLoadingStatus, setDisplayedLoadingStatus] = useState(
    loadingStatus,
  );

  useEffect(() => {
    if (loadingStatus) {
      setDisplayedLoadingStatus(loadingStatus);
      return undefined;
    }

    const clearTimer = window.setTimeout(() => {
      setDisplayedLoadingStatus("");
    }, 260);
    return () => window.clearTimeout(clearTimer);
  }, [loadingStatus]);

  if (
    !feedSource &&
    !updatedLabel &&
    !routeProviderLabel &&
    !loadingStatus &&
    !displayedLoadingStatus &&
    !wakeLockActive
  ) {
    return null;
  }

  const isMapCorner = placement === "map-corner";
  const isInfer = feedStatus === "infer";
  const hasPrimary = feedSource || routeProviderLabel || updatedLabel || wakeLockActive;

  return (
    <div
      className={cn(
        rootClassName,
        isMapCorner && mapCornerClassName,
      )}
      aria-label="Map data sources"
    >
      {hasPrimary ? (
        <span className={lineClassName}>
          {wakeLockActive ? (
            <>
              <StatusSpan className="flex-none tabular-nums text-atc-orange">
                ☕ Keep awake
              </StatusSpan>
              {(feedSource || routeProviderLabel || updatedLabel) ? (
                <span
                  aria-hidden="true"
                  className={diamondClassName}
                />
              ) : null}
            </>
          ) : null}
          {feedSource ? (
            <StatusSpan
              className={cn("flex-none notranslate", isInfer && "text-atc-faint")}
            >
              {feedSource}
            </StatusSpan>
          ) : null}
          {feedSource && routeProviderLabel ? (
            <span
              aria-hidden="true"
              className={diamondClassName}
            />
          ) : null}
          {routeProviderLabel ? (
            <StatusSpan className="flex-none notranslate">
              {routeProviderLabel}
            </StatusSpan>
          ) : null}
          {(feedSource || routeProviderLabel) && updatedLabel ? (
            <span
              aria-hidden="true"
              className={diamondClassName}
            />
          ) : null}
          {updatedLabel ? (
            <StatusSpan
              className={cn("flex-none tabular-nums", isInfer && "text-atc-faint")}
            >
              {updatedLabel}
            </StatusSpan>
          ) : null}
        </span>
      ) : null}
      {loadingActive || displayedLoadingStatus ? (
        <span
          className="flex w-full min-w-0 items-center justify-end overflow-hidden [.airport-map-menu--mobile_&]:justify-center [.airport-map-menu--mobile_&]:text-center"
          aria-hidden={!loadingActive}
        >
          <span
            className={cn(
              loadingClassName,
              loadingActive && "opacity-100",
            )}
          >
            {displayedLoadingStatus}
          </span>
        </span>
      ) : null}
    </div>
  );
}
