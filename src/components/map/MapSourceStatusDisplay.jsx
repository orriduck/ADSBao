"use client";

import { useEffect, useState } from "react";
import EndfieldValueSwap from "@/components/effects/EndfieldValueSwap.jsx";
import RequestPulseDots from "@/components/ui/RequestPulseDots";

export default function MapSourceStatusDisplay({
  feedSource = "",
  feedStatus = "live",
  updatedLabel = "",
  routeProviderLabel = "",
  loadingStatus = "",
  feedLiveLabel = "ADS-B feed live",
  placement = "mobile-map",
  loadingMotion = "static",
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
    loadingActive ? "map-source-status--loading-active" : "",
    loadingMotion === "shift" ? "map-source-status--shift-loading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClassName}
      aria-label="Map data sources"
    >
      <span className="map-source-status__primary">
        {feedSource || updatedLabel ? (
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
            {feedSource ? <RequestPulseDots ariaLabel={feedLiveLabel} /> : null}
            {updatedLabel ? (
              <EndfieldValueSwap
                identityKey={`updated:${updatedLabel}`}
                value={<span>{updatedLabel}</span>}
                className="map-source-status__time"
                direction="reverse"
              />
            ) : null}
          </span>
        ) : null}
        {routeProviderLabel ? (
          <span className="map-source-status__route">
            <span
              aria-hidden="true"
              className="map-source-status__diamond"
            />
            <EndfieldValueSwap
              identityKey={`route-provider:${routeProviderLabel}`}
              value={(
                <span className="notranslate" translate="no">
                  {routeProviderLabel}
                </span>
              )}
              direction="reverse"
            />
          </span>
        ) : null}
      </span>
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
