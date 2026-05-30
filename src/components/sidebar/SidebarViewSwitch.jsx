"use client";

import { useMemo } from "react";
import NumberFlow from "@number-flow/react";
import { SidebarMetricCard, SidebarMetricGrid } from "./SidebarMetric";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel.js";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement.js";

export default function SidebarViewSwitch({
  activeView = "briefing",
  onViewChange,
  metar = null,
  aircraft = [],
  routeProvider = "",
}) {
  const { t } = useI18n();
  const temperature = formatTemperature(metar);
  const rule = metar?.flightCategory?.toUpperCase() || "WX";
  const showMovementCards = routeProvider === ROUTE_PROVIDER.FLIGHTAWARE;

  // Pre-compute departure / arrival counts only when FlightAware is on.
  // The aircraft.movement field is already resolved upstream by
  // enrichAircraftWithRoutes, so this is just two filters.
  const { departureCount, arrivalCount } = useMemo(() => {
    if (!showMovementCards) return { departureCount: 0, arrivalCount: 0 };
    let dep = 0;
    let arr = 0;
    for (const item of aircraft) {
      if (item?.movement === DEPARTURE) dep += 1;
      else if (item?.movement === ARRIVAL) arr += 1;
    }
    return { departureCount: dep, arrivalCount: arr };
  }, [aircraft, showMovementCards]);

  return (
    <SidebarMetricGrid label={t("sidebar.airportViews")}>
      <SidebarMetricCard
        label={t("sidebar.weather")}
        value={temperature.value}
        unit={temperature.unit}
        active={activeView === "briefing"}
        onClick={() => onViewChange?.("briefing")}
      />
      <SidebarMetricCard
        label={t("sidebar.flights")}
        value={<NumberFlow value={aircraft.length} />}
        unit={`${rule} / ADS-B`}
        active={activeView === "traffic"}
        onClick={() => onViewChange?.("traffic")}
      />
      {showMovementCards && (
        <>
          <SidebarMetricCard
            label={t("sidebar.departures")}
            value={<NumberFlow value={departureCount} />}
            unit="OUT"
          />
          <SidebarMetricCard
            label={t("sidebar.arrivals")}
            value={<NumberFlow value={arrivalCount} />}
            unit="IN"
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
