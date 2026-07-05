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
// headline metric (nearby flights) over a row of small footer cells
// (weather / ATC / spotting / movement). This is the single quiet segment that
// switches every left-column view, so only one summary surface shows at a time.
// Each segment doubles as the view-switch control — the active segment shows
// the reserved orange accent rail + faint wash (DESIGN.md: row-selection,
// trace, track button, and the active hero/telemetry segment). Hierarchy comes
// from size and luminance, not weight — numerals stay regular.
export default function SidebarViewSwitch({
  activeView = "briefing",
  onViewChange,
  metar = null,
  metarLoading = false,
  aircraft = [],
  routeProvider = "",
  frequencies = [],
  candidateSpotCount = 0,
  onOpenSpotting,
  nearMe = false,
  nearMeSelfSpeedMps = null,
  nearMeSelfAltitudeMeters = null,
  nearMeSelfHeadingDeg = null,
  featureFlagsResolved = true,
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

  // The footer's product rules — which cells show, what they read, and how they
  // behave (here mode swaps departures/arrivals for the user's own GPS
  // speed/altitude, the movement row only exists on FlightAware, ATC only when
  // there are frequencies) — live in a pure, tested model. This component only
  // maps each descriptor to a <StatTile>.
  const stats = useMemo(
    () =>
      buildSidebarStats({
        nearMe,
        routeProvider,
        featureFlagsResolved,
        aircraft,
        selfSpeedMps: nearMeSelfSpeedMps,
        selfAltitudeMeters: nearMeSelfAltitudeMeters,
        selfHeadingDeg: nearMeSelfHeadingDeg,
        groundSpeedUnit,
        metar,
        metarLoading,
        units,
        atcCount,
        spottingCount,
      }),
    [
      nearMe,
      routeProvider,
      featureFlagsResolved,
      aircraft,
      nearMeSelfSpeedMps,
      nearMeSelfAltitudeMeters,
      nearMeSelfHeadingDeg,
      groundSpeedUnit,
      metar,
      metarLoading,
      units,
      atcCount,
      spottingCount,
    ],
  );

  const renderStat = (stat: SidebarStat) => {
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

  const headlineLabel = nearMe ? t("sidebar.nearby") : t("sidebar.flights");
  // The flight-count is the hero only on the traffic view. On the other
  // sub-views it demotes to a compact summary row so it does not stack a
  // second hero above that view's own hero (e.g. the weather flight-rules
  // block). The headline stays a tab back to traffic; structure is unchanged.
  const isTraffic = activeView === "traffic";

  return (
    <div className="px-[var(--airport-sidebar-inset)] pt-3.5">
      <div className="overflow-hidden rounded-[var(--atc-radius-panel)] border border-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] bg-[color-mix(in_oklab,var(--atc-text)_3.5%,transparent)]">
        {/* One morphing layout (not two swapped branches) so switching to/from
            the traffic view animates: the hero block expands via a max-height
            transition, the count cross-fades between its compact (inline, right)
            and hero (large, below) positions, and the padding eases. The
            isTraffic-driven class swaps (not group-data variants) are what the
            CSS transitions interpolate. */}
        <button
          type="button"
          data-active={isTraffic ? "true" : undefined}
          onClick={() => onViewChange?.("traffic")}
          aria-pressed={isTraffic}
          className={`relative block w-full px-[11px] text-left transition-[background-color,padding] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:origin-center before:scale-x-0 before:bg-[var(--atc-signal-accent)] before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.34,1.3,0.64,1)] hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)] data-[active=true]:before:scale-x-100 ${
            isTraffic ? "pb-3 pt-[15px]" : "py-[14px]"
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[calc(10px*var(--sb-body-scale))] font-semibold uppercase tracking-[0.14em] text-atc-faint">
              {headlineLabel}
            </span>
            <span
              className={`tabular-nums text-[calc(16px*var(--sb-body-scale))] font-normal text-atc-text transition-opacity duration-200 ease-out ${
                isTraffic ? "opacity-0" : "opacity-100"
              }`}
            >
              <NumberFlow value={aircraft.length} />
            </span>
          </div>
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isTraffic ? "max-h-[80px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <span className="block pt-1.5 text-[calc(44px*var(--sb-body-scale))] font-normal leading-[0.9] tracking-[-0.02em] tabular-nums text-atc-text">
              <NumberFlow value={aircraft.length} />
            </span>
          </div>
        </button>
        {stats.movementRow.length > 0 ? (
          <div className="flex border-t border-[var(--app-frost-border)]">
            {stats.movementRow.map(renderStat)}
          </div>
        ) : null}
        <div className="flex border-t border-[var(--app-frost-border)]">
          {stats.contextRow.map(renderStat)}
        </div>
      </div>
    </div>
  );
}
