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
import {
  ALTITUDE_FOCUS_OPTIONS,
  getAircraftIdentity,
  getContextTagLabel,
  getAircraftContextGroup,
} from "../../features/airport-context/airportContextUiModel.js";
import { formatFlightRouteMunicipalityLabel } from "../../utils/flightRouteDisplay.js";
import AircraftList from "./AircraftList.jsx";

const TRAFFIC_FILTERS = [
  { value: "all", label: "All" },
  { value: "routed", label: "Routes only" },
];

const ALTITUDE_LEVELS = [
  { value: "all", label: "Any" },
  { value: "ground", label: "Ground" },
  { value: "climb-descent", label: "Climb / descent" },
  { value: "high", label: "High" },
];

export default function AircraftTable({
  aircraft = [],
  altitudeFocus = "all",
  selectedAircraftId = "",
  onSelectAircraft,
  onAltitudeFocus,
  fill = true,
}) {
  const focusOptions = useMemo(
    () =>
      ALTITUDE_FOCUS_OPTIONS.map((option) => ({
        value: option.value,
        label: option.title,
      })),
    [],
  );
  const [query, setQuery] = useState("");
  const [trafficFilter, setTrafficFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [altitudeLevel, setAltitudeLevel] = useState("all");
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
            options={ALTITUDE_LEVELS}
            ariaLabel="Filter by altitude level"
          />
          <AircraftFilterCardSelect
            label="Focus"
            value={altitudeFocus}
            onValueChange={(value) => onAltitudeFocus?.(value)}
            options={focusOptions}
            ariaLabel="Traffic focus"
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
            altitudeFocus={altitudeFocus}
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
    .filter((item) => matchesTrafficFilter(item, trafficFilter))
    .filter((item) => matchesTypeFilter(item, typeFilter))
    .filter((item) => matchesAltitudeLevel(item, altitudeLevel))
    .filter((item) =>
      normalizedQuery ? aircraftSearchText(item).includes(normalizedQuery) : true,
    )
    .sort(sortAircraftByAltitude);
}

function matchesTrafficFilter(aircraft, trafficFilter) {
  if (trafficFilter === "airborne") return !aircraft.onGround;
  if (trafficFilter === "ground") return Boolean(aircraft.onGround);
  if (trafficFilter === "routed") {
    return Boolean(aircraft.flightRouteLabel || aircraft.flightRoute);
  }
  return true;
}

function matchesTypeFilter(aircraft, typeFilter) {
  if (typeFilter === "all") return true;
  return aircraftTypeLabel(aircraft) === typeFilter;
}

function matchesAltitudeLevel(aircraft, altitudeLevel) {
  if (altitudeLevel === "all") return true;

  const altitude = aircraft.onGround ? 0 : toNumber(aircraft.altitude);
  if (altitudeLevel === "ground") return altitude == null || altitude < 100;
  if (altitude == null) return false;
  if (altitudeLevel === "climb-descent") {
    return altitude >= 100 && altitude < 12000;
  }
  if (altitudeLevel === "high") return altitude >= 12000;
  return true;
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

function getAircraftTypes(aircraft = []) {
  return [...new Set(aircraft.map(aircraftTypeLabel).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function aircraftTypeLabel(aircraft = {}) {
  return String(aircraft.type || aircraft.category || "").trim();
}
