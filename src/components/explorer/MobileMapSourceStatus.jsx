"use client";

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
}) {
  const status = buildMobileMapSourceStatus({ feedSource, routeProvider });
  const updatedLabel = formatUpdated(lastUpdated);
  if (!status.feedSource && !updatedLabel && !status.routeProvider) return null;

  return (
    <div
      className={`airport-map-source-status airport-map-source-status--${feedStatus}`}
      aria-label="Map data sources"
    >
      {status.feedSource || updatedLabel ? (
        <span className="airport-map-source-status__line">
          {status.feedSource ? (
            <span className="airport-map-source-status__source notranslate" translate="no">
              {status.feedSource}
            </span>
          ) : null}
          {status.feedSource ? <RequestPulseDots ariaLabel="ADS-B feed live" /> : null}
          {updatedLabel ? (
            <span className="airport-map-source-status__time">{updatedLabel}</span>
          ) : null}
        </span>
      ) : null}
      {status.routeProvider ? (
        <span className="airport-map-source-status__route">
          <span
            aria-hidden="true"
            className="airport-map-source-status__diamond"
          />
          <span className="notranslate" translate="no">
            {status.routeProvider}
          </span>
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
