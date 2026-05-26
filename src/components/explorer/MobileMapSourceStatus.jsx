"use client";

import EndfieldValueSwap from "@/components/effects/EndfieldValueSwap.jsx";
import RequestPulseDots from "@/components/ui/RequestPulseDots";
import {
  ROUTE_PROVIDER,
  buildMobileMapSourceStatus,
} from "@/features/aviation/sourceDisplayModel.js";

export default function MobileMapSourceStatus({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  routeProvider = ROUTE_PROVIDER.ADSBDB,
  loadingStatus = "",
}) {
  const status = buildMobileMapSourceStatus({ feedSource, routeProvider });
  const updatedLabel = formatUpdated(lastUpdated);
  if (!status.feedSource && !updatedLabel && !status.routeProvider && !loadingStatus) {
    return null;
  }

  return (
    <div
      className={`airport-map-source-status airport-map-source-status--${feedStatus}`}
      aria-label="Map data sources"
    >
      {status.feedSource || updatedLabel ? (
        <span className="airport-map-source-status__line">
          {status.feedSource ? (
            <EndfieldValueSwap
              identityKey={`source:${status.feedSource}`}
              value={(
                <span className="notranslate" translate="no">
                  {status.feedSource}
                </span>
              )}
              className="airport-map-source-status__source"
              direction="reverse"
            />
          ) : null}
          {status.feedSource ? <RequestPulseDots ariaLabel="ADS-B feed live" /> : null}
          {updatedLabel ? (
            <EndfieldValueSwap
              identityKey={`updated:${updatedLabel}`}
              value={<span>{updatedLabel}</span>}
              className="airport-map-source-status__time"
              direction="reverse"
            />
          ) : null}
        </span>
      ) : null}
      {status.routeProvider ? (
        <span className="airport-map-source-status__route">
          <span
            aria-hidden="true"
            className="airport-map-source-status__diamond"
          />
          <EndfieldValueSwap
            identityKey={`route-provider:${status.routeProvider}`}
            value={(
              <span className="notranslate" translate="no">
                {status.routeProvider}
              </span>
            )}
            direction="reverse"
          />
        </span>
      ) : null}
      {loadingStatus ? (
        <span className="airport-map-source-status__loading">
          <EndfieldValueSwap
            identityKey={`loading:${loadingStatus}`}
            value={<span>{loadingStatus}</span>}
            direction="reverse"
          />
        </span>
      ) : null}
    </div>
  );
}

function formatUpdated(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
