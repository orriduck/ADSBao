import { useMemo, useState } from "react";
import { CloudSun, MapPin, Plane, Route } from "lucide-react";
import WayfindingMetric from "@/components/ui/WayfindingMetric";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  buildSidebarStats,
  type SidebarStat,
} from "@/features/airport/explorer/sidebarStatsModel";
import { defaultGroundSpeedUnit, type GroundSpeedUnit } from "@/utils/units";

// Frosted "hero stats block": one joined rounded glass container with a big
// flight count over a fixed two-by-two control matrix (weather / flight rule /
// ATC / spotting). This is the single quiet segment that switches every
// left-column view, so only one summary surface shows at a time.
// Each segment doubles as the view-switch control — the active segment shows
// the reserved orange accent rail + faint wash (DESIGN.md: row-selection,
// trace, track button, and the active hero/telemetry segment). Hierarchy comes
// from size and luminance, not weight — numerals stay regular.
export default function SidebarViewSwitch({
  activeView = "traffic",
  onViewChange,
  metar = null,
  metarLoading = false,
  localWeather = null,
  localWeatherLoading = false,
  aircraft = [],
  nearbyAirportCount = 0,
  frequencies = [],
  candidateSpotCount = 0,
  onOpenSpotting,
  nearMe = false,
  nearMeSelfSpeedMps = null,
  nearMeSelfAltitudeMeters = null,
  nearMeSelfHeadingDeg = null,
  footer = null,
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  // Here-mode ground speed is km/h or mph (never knots). Its default follows the
  // user's metric/imperial setting; a tap overrides it for the session.
  const [speedUnitOverride, setSpeedUnitOverride] =
    useState<GroundSpeedUnit | null>(null);
  const groundSpeedUnit = speedUnitOverride ?? defaultGroundSpeedUnit(units);
  const atcCount = Array.isArray(frequencies) ? frequencies.length : 0;
  const spottingCount = Number(candidateSpotCount) || 0;

  // The summary's product rules live in a pure model. This component only maps
  // each descriptor to a StatTile and wires its interaction.
  const stats = useMemo(
    () =>
      buildSidebarStats({
        nearMe,
        selfSpeedMps: nearMeSelfSpeedMps,
        selfAltitudeMeters: nearMeSelfAltitudeMeters,
        selfHeadingDeg: nearMeSelfHeadingDeg,
        groundSpeedUnit,
        metar,
        metarLoading,
        localTemperatureC: localWeather?.temperatureC ?? null,
        localWeatherLoading,
        units,
        atcCount,
        spottingCount,
      }),
    [
      nearMe,
      nearMeSelfSpeedMps,
      nearMeSelfAltitudeMeters,
      nearMeSelfHeadingDeg,
      groundSpeedUnit,
      metar,
      metarLoading,
      localWeather?.temperatureC,
      localWeatherLoading,
      units,
      atcCount,
      spottingCount,
    ],
  );

  const renderStat = (stat: SidebarStat, icon, className = "") => {
    const { id, labelKey, value, display, unit, prefix, interaction } = stat;
    let active: boolean | undefined;
    let onClick: (() => void) | undefined;
    let readOnly = false;
    if (interaction.kind === "view") {
      active = activeView === interaction.view;
      onClick = () => onViewChange?.(interaction.view);
    } else if (interaction.kind === "spotting") {
      active = activeView === "spotting";
      onClick = onOpenSpotting;
    } else if (interaction.kind === "groundSpeedToggle") {
      onClick = () =>
        setSpeedUnitOverride(groundSpeedUnit === "kmh" ? "mph" : "kmh");
    } else {
      readOnly = true;
    }
    return (
      <WayfindingMetric
        key={id}
        icon={icon}
        title={t(labelKey)}
        value={value ?? "—"}
        animateValue={display === "numberFlow"}
        unit={unit || undefined}
        prefix={prefix}
        active={active}
        onClick={onClick}
        readOnly={readOnly}
        className={className}
      />
    );
  };

  const isTraffic = activeView === "traffic";
  const weatherStat = stats.contextRow.find((stat) => stat.id === "weather");
  const flightRulesStat = stats.contextRow.find(
    (stat) => stat.id === "flightRules",
  );

  return (
    <div className="airport-wayfinding-summary">
      <div className="wayfinding-metrics-grid grid grid-cols-2 gap-px bg-[var(--airport-wayfinding-divider)]">
        <WayfindingMetric
          icon={<Plane />}
          title={nearMe ? t("sidebar.nearby") : t("sidebar.flights")}
          value={aircraft.length}
          animateValue
          active={isTraffic}
          onClick={() => onViewChange?.("traffic")}
        />
        {weatherStat ? renderStat(weatherStat, <CloudSun />) : null}
        {flightRulesStat ? renderStat(flightRulesStat, <Route />) : null}
        <WayfindingMetric
          icon={<MapPin />}
          title={t("sidebar.nearby")}
          value={Number(nearbyAirportCount) || 0}
          animateValue
          readOnly
        />
      </div>
      {footer ? <div className="sidebar-wayfinding-provider">{footer}</div> : null}
    </div>
  );
}
