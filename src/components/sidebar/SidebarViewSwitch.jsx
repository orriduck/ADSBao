"use client";

import NumberFlow from "@number-flow/react";

export default function SidebarViewSwitch({
  activeView = "briefing",
  onViewChange,
  metar = null,
  aircraftCount = 0,
}) {
  const temperature = formatTemperature(metar);
  const rule = metar?.flightCategory?.toUpperCase() || "WX";

  return (
    <div className="airport-sidebar-view-switch" role="tablist" aria-label="Airport sidebar views">
      <SwitchButton
        active={activeView === "briefing"}
        label="Weather"
        value={temperature.value}
        unit={temperature.unit}
        onClick={() => onViewChange?.("briefing")}
      />
      <SwitchButton
        active={activeView === "traffic"}
        label="Flights"
        value={<NumberFlow value={aircraftCount} />}
        unit={`${rule} / ADS-B`}
        divided
        onClick={() => onViewChange?.("traffic")}
      />
    </div>
  );
}

function SwitchButton({
  active = false,
  label,
  value,
  unit = "",
  divided = false,
  onClick,
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`airport-sidebar-view-switch__button ${
        active ? "airport-sidebar-view-switch__button--active" : ""
      } ${divided ? "airport-sidebar-view-switch__button--divided" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong className="airport-sidebar-display-mono airport-sidebar-display-mono--metric">
        {value}
      </strong>
      {unit ? <small>{unit}</small> : null}
    </button>
  );
}

function formatTemperature(metar) {
  const temp = Number(metar?.rawTemp);
  if (!Number.isFinite(temp)) return { value: "—", unit: "°C" };
  return { value: Math.round(temp), unit: "°C" };
}
