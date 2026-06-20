import { useMemo } from "react";
import { MetricCard as SidebarMetricCard, MetricGrid as SidebarMetricGrid } from "@/components/ui/MetricCard";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement";
import {
  convertTemperatureFromC,
  temperatureUnitLabel,
} from "@/utils/units";

export default function SidebarViewSwitch({
  activeView = "briefing",
  onViewChange,
  metar = null,
  aircraft = [],
  metarLoading = false,
  routeProvider = "",
  frequencies = [],
  candidateSpotCount = 0,
  onOpenSpotting,
  // Near-me mode: the explorer is centered on the user's location
  // (not an airport). Keep the metric surface to weather + nearby
  // aircraft because airport-specific ATC, spotting, and movement
  // buckets do not apply.
  nearMe = false,
  // When feature flags haven't resolved yet, hold the layout stable
  // at its pre-resolution state. Prevents dep/arr cards from
  // appearing mid-flight when FlightAware flips from unresolved→true.
  featureFlagsResolved = true,
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const temperature = formatTemperature(metar, units.temperature);
  // When METAR is loading, show a pending label instead of default
  // "WX" — the user should see that data is inbound, not assume WX means
  // the flight rule category.
  const isMetarMissing = !metar;
  const rule = metarLoading && isMetarMissing
    ? "—"
    : (metar?.flightCategory?.toUpperCase() || "WX");
  const showMovementCards =
    featureFlagsResolved && routeProvider === ROUTE_PROVIDER.FLIGHTAWARE;
  const atcCount = Array.isArray(frequencies) ? frequencies.length : 0;
  const spottingCount = Number(candidateSpotCount) || 0;
  const showAtcCard = atcCount > 0;

  // Pre-compute departure / arrival counts only when FlightAware is on.
  // The aircraft.movement field is already resolved upstream by
  // enrichAircraftWithRoutes, so this is just two filters.
  const { departureCount, arrivalCount } = useMemo(() => {
    if (routeProvider !== ROUTE_PROVIDER.FLIGHTAWARE) {
      return { departureCount: 0, arrivalCount: 0 };
    }
    let dep = 0;
    let arr = 0;
    for (const item of aircraft) {
      if (item?.movement === DEPARTURE) dep += 1;
      else if (item?.movement === ARRIVAL) arr += 1;
    }
    return { departureCount: dep, arrivalCount: arr };
  }, [aircraft, routeProvider]);

  if (nearMe) {
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
          label={t("sidebar.nearby")}
          value={aircraft.length}
          unit={`${rule} / ADS-B`}
          active={activeView === "traffic"}
          onClick={() => onViewChange?.("traffic")}
        />
      </SidebarMetricGrid>
    );
  }

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
        value={aircraft.length}
        unit={`${rule} / ADS-B`}
        active={activeView === "traffic"}
        onClick={() => onViewChange?.("traffic")}
      />
      {showAtcCard && (
        <SidebarMetricCard
          label={t("sidebar.atc")}
          value={atcCount}
          unit={t("sidebar.metricUnits.frequency")}
          active={activeView === "atc"}
          onClick={() => onViewChange?.("atc")}
        />
      )}
      <SidebarMetricCard
        label={t("sidebar.spotting")}
        value={spottingCount}
        unit={t("sidebar.metricUnits.spots")}
        active={activeView === "spotting"}
        onClick={onOpenSpotting}
      />
      {showMovementCards && (
        <>
          <SidebarMetricCard
            label={t("sidebar.departures")}
            value={departureCount}
            unit={t("sidebar.metricUnits.flights")}
            active={activeView === "departures"}
            onClick={() => onViewChange?.("departures")}
          />
          <SidebarMetricCard
            label={t("sidebar.arrivals")}
            value={arrivalCount}
            unit={t("sidebar.metricUnits.flights")}
            active={activeView === "arrivals"}
            onClick={() => onViewChange?.("arrivals")}
          />
        </>
      )}
    </SidebarMetricGrid>
  );
}

function formatTemperature(metar, unit) {
  const temp = Number(metar?.rawTemp);
  const label = temperatureUnitLabel(unit);
  if (!Number.isFinite(temp)) return { value: "—", unit: label };
  return { value: Math.round(convertTemperatureFromC(temp, unit)), unit: label };
}
