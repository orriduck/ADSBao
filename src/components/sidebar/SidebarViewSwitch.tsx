import { useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  Camera,
  Clock3,
  CloudSun,
  Compass,
  Gauge,
  MapPin,
  Plane,
  RadioTower,
  Route,
} from "lucide-react";
import WayfindingMetric from "@/components/ui/WayfindingMetric";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  buildSidebarStats,
  type SidebarStat,
} from "@/features/airport/explorer/sidebarStatsModel";
import { defaultGroundSpeedUnit, type GroundSpeedUnit } from "@/utils/units";
import { useAirportLocalTime } from "@/hooks/useAirportLocalTime";

// One rounded summary groups the airport's readings and view controls.
// A neutral inset and short underline identify the selected view; large,
// light numerals provide hierarchy without changing the theme palette.
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
  const defaultSpeedUnit = defaultGroundSpeedUnit(units);
  const groundSpeedUnit = speedUnitOverride ?? defaultSpeedUnit;
  const atcCount = Array.isArray(frequencies) ? frequencies.length : 0;
  const spottingCount = Number(candidateSpotCount) || 0;
  const airportLocalTime = useAirportLocalTime(
    nearMe ? "" : localWeather?.timezone,
  );

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
        setSpeedUnitOverride(
          groundSpeedUnit === defaultSpeedUnit
            ? defaultSpeedUnit === "kmh"
              ? "mph"
              : "kmh"
            : null,
        );
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
        tone={
          interaction.kind === "groundSpeedToggle" &&
          groundSpeedUnit !== defaultSpeedUnit
            ? "secondary"
            : "neutral"
        }
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
  const atcStat = stats.contextRow.find((stat) => stat.id === "atc");
  const spottingStat = stats.contextRow.find((stat) => stat.id === "spotting");
  const briefingStat = stats.contextRow.find((stat) => stat.id === "briefing");
  const headingStat = stats.contextRow.find((stat) => stat.id === "heading");
  const speedStat = stats.movementRow.find((stat) => stat.id === "selfSpeed");
  const altitudeStat = stats.movementRow.find(
    (stat) => stat.id === "selfAltitude",
  );

  const trafficMetric = (
    <WayfindingMetric
      icon={<Plane />}
      title={nearMe ? t("sidebar.nearby") : t("sidebar.flights")}
      value={aircraft.length}
      animateValue
      active={isTraffic}
      onClick={() => onViewChange?.("traffic")}
    />
  );

  const nearbyMetric = (
    <WayfindingMetric
      icon={<MapPin />}
      title={t("sidebar.nearby")}
      value={Number(nearbyAirportCount) || 0}
      animateValue
      readOnly
    />
  );

  const localTimeMetric = (
    <WayfindingMetric
      icon={<Clock3 />}
      title={t("sidebar.localTime")}
      value={airportLocalTime.value}
      unit={airportLocalTime.zone || undefined}
      className="wayfinding-metric--clock"
      readOnly
    />
  );

  return (
    <div className="airport-wayfinding-summary">
      <div className="wayfinding-metrics-grid grid grid-cols-2 gap-px bg-[var(--airport-wayfinding-divider)]">
        {nearMe ? (
          <>
            {trafficMetric}
            {briefingStat ? renderStat(briefingStat, <CloudSun />) : null}
            {speedStat ? renderStat(speedStat, <Gauge />) : null}
            {altitudeStat
              ? renderStat(altitudeStat, <ArrowUpFromLine />)
              : null}
            {headingStat ? renderStat(headingStat, <Compass />) : null}
            {nearbyMetric}
          </>
        ) : (
          <>
            {trafficMetric}
            {weatherStat ? renderStat(weatherStat, <CloudSun />) : null}
            {flightRulesStat ? renderStat(flightRulesStat, <Route />) : null}
            {localTimeMetric}
          </>
        )}
      </div>
      {atcStat || spottingStat ? (
        <div className="wayfinding-secondary-view-grid grid grid-cols-2 gap-px bg-[var(--airport-wayfinding-divider)]">
          {atcStat
            ? renderStat(atcStat, <RadioTower />, "wayfinding-metric--compact")
            : null}
          {spottingStat
            ? renderStat(
                spottingStat,
                <Camera />,
                "wayfinding-metric--compact",
              )
            : null}
        </div>
      ) : null}
      {footer ? <div className="sidebar-wayfinding-provider">{footer}</div> : null}
    </div>
  );
}
