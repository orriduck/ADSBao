"use client";

import NumberFlow from "@number-flow/react";
import { SidebarMetricCard, SidebarMetricGrid } from "./SidebarMetric";

export default function SidebarViewSwitch({
  activeView = "briefing",
  onViewChange,
  metar = null,
  aircraftCount = 0,
}) {
  const temperature = formatTemperature(metar);
  const rule = metar?.flightCategory?.toUpperCase() || "WX";

  return (
    <SidebarMetricGrid label="Airport sidebar views">
      <SidebarMetricCard
        label="Weather"
        value={temperature.value}
        unit={temperature.unit}
        active={activeView === "briefing"}
        onClick={() => onViewChange?.("briefing")}
      />
      <SidebarMetricCard
        label="Flights"
        value={<NumberFlow value={aircraftCount} />}
        unit={`${rule} / ADS-B`}
        active={activeView === "traffic"}
        onClick={() => onViewChange?.("traffic")}
      />
    </SidebarMetricGrid>
  );
}

function formatTemperature(metar) {
  const temp = Number(metar?.rawTemp);
  if (!Number.isFinite(temp)) return { value: "—", unit: "°C" };
  return { value: Math.round(temp), unit: "°C" };
}
