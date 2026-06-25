import { useMemo } from "react";
import NumberFlow from "@number-flow/react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement";
import {
  convertTemperatureFromC,
  temperatureUnitLabel,
} from "@/utils/units";

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
  featureFlagsResolved = true,
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const temperature = metarLoading
    ? { value: "—", unit: temperatureUnitLabel(units.temperature) }
    : formatTemperature(metar, units.temperature);
  const temperatureUnit = temperature.value === "—" ? undefined : temperature.unit;
  const showMovementCards =
    featureFlagsResolved && routeProvider === ROUTE_PROVIDER.FLIGHTAWARE;
  const atcCount = Array.isArray(frequencies) ? frequencies.length : 0;
  const spottingCount = Number(candidateSpotCount) || 0;
  const showAtcCard = atcCount > 0;

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

  const footerCells = [];
  footerCells.push({
    key: "briefing",
    label: t("sidebar.weather"),
    value: temperature.value,
    unit: temperatureUnit,
    active: activeView === "briefing",
    onClick: () => onViewChange?.("briefing"),
  });
  if (showAtcCard) {
    footerCells.push({
      key: "atc",
      label: t("sidebar.atc"),
      value: <NumberFlow value={atcCount} />,
      active: activeView === "atc",
      onClick: () => onViewChange?.("atc"),
    });
  }
  footerCells.push({
    key: "spotting",
    label: t("sidebar.spotting"),
    value: <NumberFlow value={spottingCount} />,
    active: activeView === "spotting",
    onClick: onOpenSpotting,
  });
  if (showMovementCards) {
    footerCells.push({
      key: "departures",
      label: t("sidebar.departures"),
      value: <NumberFlow value={departureCount} />,
      active: activeView === "departures",
      onClick: () => onViewChange?.("departures"),
    });
    footerCells.push({
      key: "arrivals",
      label: t("sidebar.arrivals"),
      value: <NumberFlow value={arrivalCount} />,
      active: activeView === "arrivals",
      onClick: () => onViewChange?.("arrivals"),
    });
  }

  const headlineLabel = nearMe ? t("sidebar.nearby") : t("sidebar.flights");

  return (
    <div className="px-[var(--airport-sidebar-inset)] pt-3.5">
      <div className="overflow-hidden rounded-[var(--atc-radius-panel)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-muted)] shadow-[var(--atc-control-inset-shadow-subtle)]">
        <button
          type="button"
          data-active={activeView === "traffic" ? "true" : undefined}
          onClick={() => onViewChange?.("traffic")}
          aria-pressed={activeView === "traffic"}
          className="block w-full px-[15px] pb-[11px] pt-[13px] text-left transition-colors hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)] data-[active=true]:shadow-[inset_2px_0_0_var(--atc-signal-accent)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-atc-dim">
              {headlineLabel}
            </span>
          </div>
          <div className="mt-[5px] flex items-baseline gap-2">
            <span className="text-[33px] font-normal leading-none tracking-[-1px] tabular-nums text-atc-text">
              <NumberFlow value={aircraft.length} />
            </span>
          </div>
        </button>
        <div className="flex border-t border-[var(--app-frost-border)]">
          {footerCells.map((cell) => (
            <StatCell key={cell.key} {...cell} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, unit, active, onClick }) {
  return (
    <button
      type="button"
      data-active={active ? "true" : undefined}
      onClick={onClick}
      aria-pressed={active}
      className="flex-1 px-[13px] py-[9px] text-left transition-colors [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[var(--app-frost-border)] hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)] data-[active=true]:shadow-[inset_0_2px_0_var(--atc-signal-accent)]"
    >
      <div className="text-[10px] text-atc-faint">{label}</div>
      <div className="mt-[3px]">
        <span className="text-[16px] font-normal tabular-nums text-atc-text">
          {value}
        </span>
        {unit ? (
          <span className="ml-0.5 text-[10px] text-atc-faint">{unit}</span>
        ) : null}
      </div>
    </button>
  );
}

function formatTemperature(metar, unit) {
  const temp = Number(metar?.rawTemp);
  const label = temperatureUnitLabel(unit);
  if (!Number.isFinite(temp)) return { value: "—", unit: label };
  return { value: Math.round(convertTemperatureFromC(temp, unit)), unit: label };
}
