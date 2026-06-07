"use client";

import { useMemo } from "react";
import NumberFlow from "@number-flow/react";
import { SidebarMetricCard, SidebarMetricGrid } from "./SidebarMetric";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement";

export default function SidebarViewSwitch({
  activeView = "briefing",
  onViewChange,
  metar = null,
  aircraft = [],
  routeProvider = "",
  frequencies = [],
  candidateSpotCount = 0,
  onOpenSpotting,
  // Near-me mode: the explorer is centered on the user's location
  // (not an airport). The weather card still shows the live
  // temperature (sourced from the closest airport's METAR) but is
  // no longer clickable — there's no airport briefing to drill into.
  // ATC / Spotting / Departures / Arrivals all surface as
  // non-interactive "—" placeholders since none of those datasets
  // apply to an arbitrary lat/lon. Only the Flights card stays
  // interactive (and that's the default view anyway).
  nearMe = false,
}) {
  const { t } = useI18n();
  const temperature = formatTemperature(metar);
  const rule = metar?.flightCategory?.toUpperCase() || "WX";
  const showMovementCards =
    nearMe || routeProvider === ROUTE_PROVIDER.FLIGHTAWARE;
  const atcCount = Array.isArray(frequencies) ? frequencies.length : 0;
  const spottingCount = Number(candidateSpotCount) || 0;
  const showAtcCard = nearMe || atcCount > 0;

  // Pre-compute departure / arrival counts only when FlightAware is on.
  // The aircraft.movement field is already resolved upstream by
  // enrichAircraftWithRoutes, so this is just two filters.
  const { departureCount, arrivalCount } = useMemo(() => {
    if (nearMe || routeProvider !== ROUTE_PROVIDER.FLIGHTAWARE) {
      return { departureCount: 0, arrivalCount: 0 };
    }
    let dep = 0;
    let arr = 0;
    for (const item of aircraft) {
      if (item?.movement === DEPARTURE) dep += 1;
      else if (item?.movement === ARRIVAL) arr += 1;
    }
    return { departureCount: dep, arrivalCount: arr };
  }, [aircraft, nearMe, routeProvider]);

  return (
    <SidebarMetricGrid label={t("sidebar.airportViews")}>
      <SidebarMetricCard
        label={t("sidebar.weather")}
        value={temperature.value}
        unit={temperature.unit}
        active={!nearMe && activeView === "briefing"}
        onClick={nearMe ? undefined : () => onViewChange?.("briefing")}
      />
      <SidebarMetricCard
        label={t("sidebar.flights")}
        value={<NumberFlow value={aircraft.length} />}
        unit={`${rule} / ADS-B`}
        active={activeView === "traffic"}
        onClick={() => onViewChange?.("traffic")}
      />
      {showAtcCard && (
        <SidebarMetricCard
          label={t("sidebar.atc")}
          value={nearMe ? "—" : <NumberFlow value={atcCount} />}
          unit={t("sidebar.metricUnits.frequency")}
          active={!nearMe && activeView === "atc"}
          onClick={nearMe ? undefined : () => onViewChange?.("atc")}
        />
      )}
      <SidebarMetricCard
        label={t("sidebar.spotting")}
        value={nearMe ? "—" : <NumberFlow value={spottingCount} />}
        unit={t("sidebar.metricUnits.spots")}
        active={!nearMe && activeView === "spotting"}
        onClick={nearMe ? undefined : onOpenSpotting}
      />
      {showMovementCards && (
        <>
          <SidebarMetricCard
            label={t("sidebar.departures")}
            value={nearMe ? "—" : <NumberFlow value={departureCount} />}
            unit={t("sidebar.metricUnits.flights")}
            active={!nearMe && activeView === "departures"}
            onClick={nearMe ? undefined : () => onViewChange?.("departures")}
          />
          <SidebarMetricCard
            label={t("sidebar.arrivals")}
            value={nearMe ? "—" : <NumberFlow value={arrivalCount} />}
            unit={t("sidebar.metricUnits.flights")}
            active={!nearMe && activeView === "arrivals"}
            onClick={nearMe ? undefined : () => onViewChange?.("arrivals")}
          />
        </>
      )}
    </SidebarMetricGrid>
  );
}

function formatTemperature(metar) {
  const temp = Number(metar?.rawTemp);
  if (!Number.isFinite(temp)) return { value: "—", unit: "°C" };
  return { value: Math.round(temp), unit: "°C" };
}
