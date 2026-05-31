"use client";

import { useEffect, useState } from "react";
import EndfieldValueSwap from "@/components/effects/EndfieldValueSwap";

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

  const rootClassName = [
    "map-source-status",
    `map-source-status--${placement}`,
    `map-source-status--${feedStatus}`,
  ].join(" ");

  const hasPrimary = feedSource || routeProviderLabel || updatedLabel;

  return (
    <div className={rootClassName} aria-label="Map data sources">
      {hasPrimary ? (
        <span className="map-source-status__line">
          {feedSource ? (
            <EndfieldValueSwap
              identityKey={`source:${feedSource}`}
              value={(
                <span className="notranslate" translate="no">
                  {feedSource}
                </span>
              )}
              className="map-source-status__source"
              direction="reverse"
            />
          ) : null}
          {feedSource && routeProviderLabel ? (
            <span aria-hidden="true" className="map-source-status__diamond" />
          ) : null}
          {routeProviderLabel ? (
            <EndfieldValueSwap
              identityKey={`route-provider:${routeProviderLabel}`}
              value={(
                <span className="notranslate" translate="no">
                  {routeProviderLabel}
                </span>
              )}
              className="map-source-status__route"
              direction="reverse"
            />
          ) : null}
          {(feedSource || routeProviderLabel) && updatedLabel ? (
            <span aria-hidden="true" className="map-source-status__diamond" />
          ) : null}
          {updatedLabel ? (
            <span className="map-source-status__time" aria-live="off">
              {updatedLabel}
            </span>
          ) : null}
        </span>
      ) : null}
      {loadingActive || displayedLoadingStatus ? (
        <span
          className={`map-source-status__loading-slot ${loadingActive ? "is-active" : ""}`}
          aria-hidden={!loadingActive}
        >
          <span className="map-source-status__loading">
            {displayedLoadingStatus}
          </span>
        </span>
      ) : null}
    </div>
  );
}
