"use client";

import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAirportExplorerUi } from "@/features/airport-explorer/AirportExplorerUiContext.jsx";
import {
  ALTITUDE_LEVEL_OPTIONS,
  aircraftMatchesFilters,
  aircraftTypeLabel,
  getAircraftTypes,
} from "@/features/aircraft-filters/aircraftFilters.js";
import {
  getAircraftContextGroup,
  getAircraftIdentity,
  getContextTagLabel,
} from "../../features/airport-context/airportContextUiModel.js";
import { formatFlightRouteMunicipalityLabel } from "../../utils/flightRouteDisplay.js";
import AircraftList from "./AircraftList.jsx";

export default function AircraftTable({
  aircraft = [],
  selectedAircraftId = "",
  onSelectAircraft,
  fill = true,
}) {
  const {
    trafficFilter,
    typeFilter,
    altitudeLevel,
    setTrafficFilter,
    setTypeFilter,
    setAltitudeLevel,
  } = useAirportExplorerUi();
  const [query, setQuery] = useState("");
  const aircraftTypes = useMemo(() => getAircraftTypes(aircraft), [aircraft]);
  const rows = useMemo(
    () =>
      filterAndSortAircraft({
        aircraft,
        altitudeLevel,
        query,
        trafficFilter,
        typeFilter,
      }),
    [aircraft, altitudeLevel, query, trafficFilter, typeFilter],
  );

  return (
    <div className={`flex flex-col ${fill ? "h-full" : ""}`}>
      <div className="flex-none">
        <div className="flex items-baseline justify-between px-[var(--airport-sidebar-inset)] pt-4 pb-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-normal text-atc-faint">
            Aircraft
          </div>
          <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-normal text-atc-dim tabular-nums">
            <NumberFlow value={rows.length} />
            <span> / </span>
            <NumberFlow value={aircraft.length} suffix=" nearby" />
          </div>
        </div>

        <div className="px-[var(--airport-sidebar-inset)] pb-3">
          <label className="aircraft-search">
            <Search size={13} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search callsign, ICAO, route"
              aria-label="Search aircraft"
            />
          </label>
        </div>

        <div
          className="aircraft-filter-cards"
          role="group"
          aria-label="Aircraft filters"
        >
          <button
            type="button"
            className="aircraft-filter-card"
            data-active={trafficFilter === "routed" ? "true" : undefined}
            aria-pressed={trafficFilter === "routed"}
            onClick={() =>
              setTrafficFilter(trafficFilter === "routed" ? "all" : "routed")
            }
          >
            <span className="aircraft-filter-card__label">Traffic</span>
            <strong className="aircraft-filter-card__value">
              {trafficFilter === "routed" ? "Routes only" : "All"}
            </strong>
          </button>

          <AircraftFilterCardSelect
            label="Type"
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: "all", label: "All" },
              ...aircraftTypes.map((type) => ({
                value: type,
                label: type,
              })),
            ]}
            ariaLabel="Filter by aircraft type"
            contentClassName="max-h-44"
          />
          <AircraftFilterCardSelect
            label="Alt"
            value={altitudeLevel}
            onValueChange={setAltitudeLevel}
            options={ALTITUDE_LEVEL_OPTIONS}
            ariaLabel="Filter by altitude level"
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_54px_70px] items-center gap-3 border-b border-[var(--atc-line)] px-[var(--airport-sidebar-inset)] py-1.5 font-mono text-[9px] uppercase text-atc-faint">
          <span>Callsign / Route</span>
          <span className="text-right">GS</span>
          <span className="text-right">ALT</span>
        </div>
      </div>

      <motion.div
        layoutScroll
        className={fill ? "flex-1 overflow-y-auto" : "overflow-visible"}
      >
        {rows.length === 0 ? (
          <div className="px-[var(--airport-sidebar-inset)] py-8 text-center text-[11px] font-semibold uppercase tracking-normal text-atc-faint">
            {aircraft.length ? "No aircraft match" : "No aircraft in range"}
          </div>
        ) : (
          <AircraftList
            aircraft={rows}
            selectedAircraftId={selectedAircraftId}
            onSelectAircraft={onSelectAircraft}
          />
        )}
      </motion.div>
    </div>
  );
}

function AircraftFilterCardSelect({
  label,
  value,
  onValueChange,
  options,
  ariaLabel,
  contentClassName = "",
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="aircraft-filter-card aircraft-filter-card--select"
      >
        <span className="aircraft-filter-card__label">{label}</span>
        <strong className="aircraft-filter-card__value">
          <SelectValue />
        </strong>
      </SelectTrigger>
      <SelectContent
        className={cn("aircraft-filter-card-content", contentClassName)}
      >
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="aircraft-filter-card-item"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function filterAndSortAircraft({
  aircraft = [],
  altitudeLevel = "all",
  query = "",
  trafficFilter = "all",
  typeFilter = "all",
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return [...aircraft]
    .filter((item) =>
      aircraftMatchesFilters(item, { trafficFilter, typeFilter, altitudeLevel }),
    )
    .filter((item) =>
      normalizedQuery ? aircraftSearchText(item).includes(normalizedQuery) : true,
    )
    .sort(sortAircraftByAltitude);
}

function aircraftSearchText(aircraft = {}) {
  const routeMunicipalities = formatFlightRouteMunicipalityLabel(
    aircraft.flightRoute,
  );

  return [
    aircraft.callsign,
    aircraft.icao24,
    aircraft.registration,
    aircraftTypeLabel(aircraft),
    aircraft.flightRouteLabel,
    routeMunicipalities,
    getAircraftContextGroup(aircraft),
    getContextTagLabel(aircraft),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortAircraftByAltitude(a, b) {
  const altitudeDelta = altitudeSortValue(b) - altitudeSortValue(a);
  if (altitudeDelta !== 0) return altitudeDelta;

  const speedDelta = (toNumber(b.velocity) ?? -1) - (toNumber(a.velocity) ?? -1);
  if (speedDelta !== 0) return speedDelta;

  return getAircraftIdentity(a).localeCompare(getAircraftIdentity(b));
}

function altitudeSortValue(aircraft = {}) {
  if (aircraft.onGround) return -1;
  return toNumber(aircraft.altitude) ?? -2;
}
