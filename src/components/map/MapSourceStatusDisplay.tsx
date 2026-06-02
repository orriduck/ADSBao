"use client";

import { useEffect, useState } from "react";
import EndfieldValueSwap from "@/components/effects/EndfieldValueSwap";
import { cn } from "@/lib/utils";

const rootClassName =
  "flex min-w-0 flex-col items-end justify-center gap-px whitespace-nowrap font-display [font-feature-settings:'tnum'_1] [text-shadow:0_1px_8px_var(--atc-bg)]";

const mapCornerClassName = cn(
  "absolute right-3 top-[calc(100%+6px)] hidden max-w-[calc(100vw-132px)] transform-none",
  "[.airport-map-menu_&]:flex",
  "[.airport-map-kit_&]:right-0.5 [.airport-map-kit_&]:top-[calc(100%+10px)]",
  "md:[.airport-map-kit_&]:top-[calc(100%+8px)]",
  "[.airport-map-menu--mobile_&]:left-1/2 [.airport-map-menu--mobile_&]:right-auto [.airport-map-menu--mobile_&]:top-[calc(100%+7px)]",
  "[.airport-map-menu--mobile_&]:max-w-[min(288px,calc(100vw-32px))] [.airport-map-menu--mobile_&]:-translate-x-1/2",
  "[.airport-map-menu--mobile_&]:items-center [.airport-map-menu--mobile_&]:text-center",
  "[.airport-map-menu--mobile_&]:[filter:drop-shadow(0_7px_11px_color-mix(in_oklab,var(--atc-bg)_72%,transparent))_drop-shadow(0_1px_1px_color-mix(in_oklab,var(--atc-text)_24%,transparent))]",
);

const lineClassName = cn(
  "flex w-full min-w-0 flex-wrap items-center justify-end gap-[7px]",
  "text-[10px] font-semibold leading-none text-atc-dim uppercase",
  "[.airport-map-kit_&]:gap-[5px] [.airport-map-kit_&]:text-[8px]",
  "[.airport-map-menu--mobile_&]:justify-center [.airport-map-menu--mobile_&]:gap-1.5",
  "[.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[9px]",
);

const diamondClassName =
  "inline-block size-[7px] flex-none rotate-45 bg-atc-orange [.airport-map-kit_&]:size-[5px] [.airport-map-menu--mobile_&]:size-1.5";

const loadingClassName = cn(
  "min-h-0 max-w-[min(280px,calc(100vw-132px))] overflow-hidden whitespace-normal",
  "text-right font-mono text-[8px] font-semibold uppercase leading-none text-atc-dim",
  "opacity-0 transition-opacity duration-200 ease-out [overflow-wrap:anywhere] will-change-[opacity] motion-reduce:transition-none",
  "[.airport-map-kit_&]:max-w-[min(224px,calc(100vw-106px))] [.airport-map-kit_&]:text-[7px]",
  "[.airport-map-menu--mobile_&]:max-w-[min(288px,calc(100vw-32px))] [.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[7px]",
);

export default function MapSourceStatusDisplay({
  feedSource = "",
  feedStatus = "live",
  updatedLabel = "",
  routeProviderLabel = "",
  loadingStatus = "",
  placement = "mobile-map",
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
    !displayedLoadingStatus
  ) {
    return null;
  }

  const isMapCorner = placement === "map-corner";
  const isInfer = feedStatus === "infer";
  const hasPrimary = feedSource || routeProviderLabel || updatedLabel;

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
          {feedSource ? (
            <EndfieldValueSwap
              identityKey={`source:${feedSource}`}
              value={(
                <span className="notranslate" translate="no">
                  {feedSource}
                </span>
              )}
              className={cn("flex-none overflow-visible", isInfer && "text-atc-faint")}
              direction="reverse"
            />
          ) : null}
          {feedSource && routeProviderLabel ? (
            <span
              aria-hidden="true"
              className={diamondClassName}
            />
          ) : null}
          {routeProviderLabel ? (
            <EndfieldValueSwap
              identityKey={`route-provider:${routeProviderLabel}`}
              value={(
                <span className="notranslate" translate="no">
                  {routeProviderLabel}
                </span>
              )}
              className="flex-none [.airport-map-menu--mobile_&]:text-[8px]"
              direction="reverse"
            />
          ) : null}
          {(feedSource || routeProviderLabel) && updatedLabel ? (
            <span
              aria-hidden="true"
              className={diamondClassName}
            />
          ) : null}
          {updatedLabel ? (
            <span
              className={cn("flex-none tabular-nums", isInfer && "text-atc-faint")}
              aria-live="off"
            >
              {updatedLabel}
            </span>
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
