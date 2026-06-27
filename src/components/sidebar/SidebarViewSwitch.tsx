import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement";
import {
  convertTemperatureFromC,
  formatAltitudeFromMeters,
  formatGroundSpeed,
  temperatureUnitLabel,
  type GroundSpeedUnit,
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
  nearMeSelfSpeedMps = null,
  nearMeSelfAltitudeMeters = null,
  featureFlagsResolved = true,
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  // Here-mode ground speed has its own unit, independent of the aviation
  // distance preference: km/h by default, tap to flip to mph.
  const [groundSpeedUnit, setGroundSpeedUnit] = useState<GroundSpeedUnit>("kmh");
  const temperature = metarLoading
    ? { value: "—", unit: temperatureUnitLabel(units.temperature) }
    : formatTemperature(metar, units.temperature);
  const temperatureUnit = temperature.value === "—" ? undefined : temperature.unit;
  // In here mode the user's position is not an airport, so departure/arrival
  // classification is meaningless (everything resolves to UNKNOWN). The movement
  // row is replaced by the user's own GPS speed/altitude readouts instead.
  const showMovementCards =
    !nearMe && featureFlagsResolved && routeProvider === ROUTE_PROVIDER.FLIGHTAWARE;
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

  // Here mode centers on the user, not an airport, so the movement row reads
  // out the user's OWN motion from GPS: ground speed (km/h, tap for mph) and
  // altitude (following the altitude preference, kept ground-relative so it
  // never reads as a flight level). Null — the common indoor/stationary case
  // where the device reports no speed/altitude — shows an em dash.
  const selfSpeedDisplay = nearMe
    ? formatGroundSpeed(nearMeSelfSpeedMps, groundSpeedUnit)
    : null;
  const selfAltitudeDisplay = nearMe
    ? formatAltitudeFromMeters(nearMeSelfAltitudeMeters, units.altitude, {
        kind: "ground",
      })
    : null;

  // Footer stacks into rows under the flight-count hero: first the movement
  // row (departures / arrivals) as the direct breakdown of the count, then
  // the context row (weather / ATC / spotting). Each conditional cell simply
  // drops out of its row when absent. In here mode the movement row carries the
  // user's own speed/altitude instead: speed is a tap target that toggles its
  // unit (km/h ⇄ mph), altitude is a static readOnly cell.
  const movementCells = [];
  if (showMovementCards) {
    movementCells.push({
      key: "departures",
      label: t("sidebar.departures"),
      value: <NumberFlow value={departureCount} />,
      active: activeView === "departures",
      onClick: () => onViewChange?.("departures"),
    });
    movementCells.push({
      key: "arrivals",
      label: t("sidebar.arrivals"),
      value: <NumberFlow value={arrivalCount} />,
      active: activeView === "arrivals",
      onClick: () => onViewChange?.("arrivals"),
    });
  } else if (nearMe) {
    // Speed is a tap target (km/h ⇄ mph); altitude is a plain readout.
    movementCells.push({
      key: "selfSpeed",
      label: t("sidebar.speed"),
      value: selfSpeedDisplay ? (
        <NumberFlow value={selfSpeedDisplay.value} />
      ) : (
        "—"
      ),
      unit: selfSpeedDisplay?.unit || undefined,
      onClick: () =>
        setGroundSpeedUnit((current) => (current === "kmh" ? "mph" : "kmh")),
    });
    movementCells.push({
      key: "selfAltitude",
      label: t("sidebar.altitude"),
      value: selfAltitudeDisplay ? (
        <NumberFlow value={selfAltitudeDisplay.value} />
      ) : (
        "—"
      ),
      unit: selfAltitudeDisplay?.unit || undefined,
      prefix: selfAltitudeDisplay?.prefix,
      readOnly: true,
    });
  }
  const restCells = [];
  restCells.push({
    key: "briefing",
    label: t("sidebar.weather"),
    value: temperature.value,
    unit: temperatureUnit,
    active: activeView === "briefing",
    onClick: () => onViewChange?.("briefing"),
  });
  if (showAtcCard) {
    restCells.push({
      key: "atc",
      label: t("sidebar.atc"),
      value: <NumberFlow value={atcCount} />,
      active: activeView === "atc",
      onClick: () => onViewChange?.("atc"),
    });
  }
  restCells.push({
    key: "spotting",
    label: t("sidebar.spotting"),
    value: <NumberFlow value={spottingCount} />,
    active: activeView === "spotting",
    onClick: onOpenSpotting,
  });

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
          className={`relative block w-full px-[16px] text-left transition-[background-color,padding] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:origin-center before:scale-x-0 before:bg-[var(--atc-signal-accent)] before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.34,1.3,0.64,1)] hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)] data-[active=true]:before:scale-x-100 ${
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
        {movementCells.length > 0 ? (
          <div className="flex border-t border-[var(--app-frost-border)]">
            {movementCells.map(({ key, ...cell }) => (
              <StatCell key={key} {...cell} />
            ))}
          </div>
        ) : null}
        <div className="flex border-t border-[var(--app-frost-border)]">
          {restCells.map(({ key, ...cell }) => (
            <StatCell key={key} {...cell} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, unit, prefix, active, onClick, readOnly = false }) {
  const body = (
    <>
      <div className="truncate text-[calc(10px*var(--sb-body-scale))] text-atc-faint">{label}</div>
      <div className="mt-[3px]">
        {prefix ? (
          <span
            className="notranslate text-[calc(10px*var(--sb-body-scale))] text-atc-faint"
            translate="no"
          >
            {prefix}
          </span>
        ) : null}
        <span className="text-[calc(16px*var(--sb-body-scale))] font-normal tabular-nums text-atc-text">
          {value}
        </span>
        {unit ? (
          <span className="ml-0.5 text-[calc(10px*var(--sb-body-scale))] text-atc-faint">{unit}</span>
        ) : null}
      </div>
    </>
  );

  // Read-only stats (here-mode speed/altitude) are not view switches: render a
  // plain cell with no hover/active affordance so they don't read as tappable.
  if (readOnly) {
    return (
      <div className="relative min-w-0 flex-1 px-[11px] py-[9px] text-left [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[var(--app-frost-border)]">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-active={active ? "true" : undefined}
      onClick={onClick}
      aria-pressed={active}
      className="relative min-w-0 flex-1 px-[11px] py-[9px] text-left transition-[background-color] duration-200 ease-out [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[var(--app-frost-border)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:origin-center before:scale-x-0 before:bg-[var(--atc-signal-accent)] before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.34,1.3,0.64,1)] hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)] data-[active=true]:before:scale-x-100"
    >
      {body}
    </button>
  );
}

function formatTemperature(metar, unit) {
  const temp = Number(metar?.rawTemp);
  const label = temperatureUnitLabel(unit);
  if (!Number.isFinite(temp)) return { value: "—", unit: label };
  return { value: Math.round(convertTemperatureFromC(temp, unit)), unit: label };
}
