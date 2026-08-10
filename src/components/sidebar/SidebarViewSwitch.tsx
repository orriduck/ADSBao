import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import StatTile from "@/components/ui/StatTile";
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

  const renderStat = (stat: SidebarStat, size: "md" | "lg" = "md") => {
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
    const rendered =
      value == null ? (
        "—"
      ) : display === "numberFlow" ? (
        <NumberFlow value={value as number} />
      ) : (
        value
      );
    return (
      <StatTile
        key={id}
        size={size}
        label={t(labelKey)}
        value={rendered}
        unit={unit || undefined}
        prefix={prefix}
        active={active}
        onClick={onClick}
        readOnly={readOnly}
      />
    );
  };

  const isTraffic = activeView === "traffic";
  const selfSpeedStat = stats.movementRow.find((stat) => stat.id === "selfSpeed");
  const selfAltitudeStat = stats.movementRow.find(
    (stat) => stat.id === "selfAltitude",
  );

  return (
    <div className="px-[var(--airport-sidebar-inset)] pt-3.5">
      <div className="sidebar-hero-stats overflow-hidden">
        {nearMe ? (
          // Here mode: nearby-count and speed are both a primary read (same
          // lg StatTile treatment as the tracked-flight sidebar's speed/
          // altitude pair) — two equally-weighted tiles, not one hero over a
          // demoted footer metric.
          <div className="grid grid-cols-2">
            <StatTile
              size="lg"
              label={t("sidebar.nearby")}
              active={isTraffic}
              onClick={() => onViewChange?.("traffic")}
              value={<NumberFlow value={aircraft.length} />}
            />
            {selfSpeedStat ? renderStat(selfSpeedStat, "lg") : null}
          </div>
        ) : (
          <div className="flex">
            <StatTile
              size="hero"
              label={t("sidebar.flights")}
              active={isTraffic}
              onClick={() => onViewChange?.("traffic")}
              value={<NumberFlow value={aircraft.length} />}
            />
          </div>
        )}
        {nearMe ? (
          <div className="flex border-t border-[var(--app-frost-border)]">
            {selfAltitudeStat ? renderStat(selfAltitudeStat) : null}
            {stats.contextRow.map((stat) => renderStat(stat))}
          </div>
        ) : (
          <>
            <div className="flex border-t border-[var(--app-frost-border)]">
              {stats.contextRow.slice(0, 2).map((stat) => renderStat(stat))}
            </div>
            <div className="flex border-t border-[var(--app-frost-border)]">
              {stats.contextRow.slice(2, 4).map((stat) => renderStat(stat))}
            </div>
          </>
        )}
      </div>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}
