"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAirportExplorerUi } from "@/components/airport/explorer/AirportExplorerUiContext.jsx";
import {
  ALTITUDE_LEVEL_OPTIONS,
  aircraftMatchesFilters,
  aircraftTypeLabel,
  getAircraftTypeGroups,
} from "@/features/aircraft/filters/aircraftFilters.js";
import {
  getAircraftContextGroup,
  getAircraftIdentity,
  getContextTagLabel,
} from "../../features/airport/context/airportContextUiModel.js";
import { formatFlightRouteMunicipalityLabel } from "../../utils/flightRouteDisplay.js";
import AircraftList from "./AircraftList.jsx";
import AircraftSlot from "./AircraftSlot.jsx";

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
  const selectedTypes = useMemo(
    () => (Array.isArray(typeFilter) ? typeFilter : []),
    [typeFilter],
  );
  const typeGroups = useMemo(
    () => getAircraftTypeGroups(aircraft, selectedTypes),
    [aircraft, selectedTypes],
  );
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
  // Pinned aircraft sits above the scrolling list and stays visible even
  // when filters would otherwise exclude it. Look in the full nearby set,
  // not the filtered rows, so a user can keep watching a selection without
  // losing it to a stray filter toggle.
  const pinnedAircraft = useMemo(() => {
    if (!selectedAircraftId) return null;
    return (
      aircraft.find((item) => getAircraftIdentity(item) === selectedAircraftId) ||
      null
    );
  }, [aircraft, selectedAircraftId]);
  // Don't duplicate the pinned aircraft inside the scroll list.
  const listRows = useMemo(() => {
    if (!pinnedAircraft) return rows;
    return rows.filter(
      (item) => getAircraftIdentity(item) !== selectedAircraftId,
    );
  }, [pinnedAircraft, rows, selectedAircraftId]);

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
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="aircraft-filter-card"
                  data-active={trafficFilter === "routed" ? "true" : undefined}
                  aria-pressed={trafficFilter === "routed"}
                  onClick={() =>
                    setTrafficFilter(
                      trafficFilter === "routed" ? "all" : "routed",
                    )
                  }
                >
                  <span className="aircraft-filter-card__label">Traffic</span>
                  <strong className="aircraft-filter-card__value">
                    {trafficFilter === "routed" ? "Routed" : "All"}
                  </strong>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-left">
                <strong className="block text-[11px] font-semibold uppercase tracking-wide">
                  Routed
                </strong>
                <span className="mt-1 block text-[11px] font-normal leading-snug">
                  Only show flights whose callsign resolved to a legitimate
                  parsed route — both origin and destination airports
                  identified.
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AircraftTypeFilterCard
            groups={typeGroups}
            selectedTypes={selectedTypes}
            onChange={setTypeFilter}
          />
          <AircraftFilterCardSelect
            label="Alt"
            value={altitudeLevel}
            onValueChange={setAltitudeLevel}
            options={ALTITUDE_LEVEL_OPTIONS}
            ariaLabel="Filter by altitude level"
            contentClassName="min-w-[220px]"
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_54px_70px] items-center gap-3 border-b border-[var(--atc-line)] px-[var(--airport-sidebar-inset)] py-1.5 font-mono text-[9px] uppercase text-atc-faint">
          <span>Callsign / Route</span>
          <span className="text-right">GS</span>
          <span className="text-right">ALT</span>
        </div>

        <AnimatePresence initial={false}>
          {pinnedAircraft && (
            <motion.div
              key="aircraft-table-pin"
              className="aircraft-table-pin"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <AircraftSlot
                aircraft={pinnedAircraft}
                cascadeOrder={0}
                flipStaggerStep={0}
                selectedAircraftId={selectedAircraftId}
                onSelectAircraft={onSelectAircraft}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        layoutScroll
        className={fill ? "flex-1 overflow-y-auto" : "overflow-visible"}
      >
        {listRows.length === 0 && !pinnedAircraft ? (
          <div className="px-[var(--airport-sidebar-inset)] py-8 text-center text-[11px] font-semibold uppercase tracking-normal text-atc-faint">
            {aircraft.length ? "No aircraft match" : "No aircraft in range"}
          </div>
        ) : (
          <AircraftList
            aircraft={listRows}
            selectedAircraftId={selectedAircraftId}
            onSelectAircraft={onSelectAircraft}
          />
        )}
      </motion.div>
    </div>
  );
}

function AircraftTypeFilterCard({ groups, selectedTypes, onChange }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const isMultiSelect = selectedTypes.length > 0;

  // Portal the panel to body so the sidebar's overflow-hidden doesn't clip it.
  // Position it relative to the trigger using fixed coordinates; re-anchor on
  // scroll and resize so the panel tracks the trigger.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return undefined;
    const update = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setPanelStyle({
        position: "fixed",
        top: rect.bottom,
        left: rect.left,
        minWidth: Math.max(rect.width, 220),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (
        wrapperRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);
  const displayValue = useMemo(() => {
    if (!isMultiSelect) return "All";
    if (selectedTypes.length === 1) return selectedTypes[0];
    return `${selectedTypes.length} types`;
  }, [isMultiSelect, selectedTypes]);

  const commit = (next) => {
    if (!next || next.length === 0) {
      onChange("all");
    } else {
      onChange(next);
    }
  };

  const toggleType = (type) => {
    const next = selectedSet.has(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    commit(next);
  };

  const toggleGroup = (group) => {
    const allSelected = group.types.every((t) => selectedSet.has(t));
    const next = allSelected
      ? selectedTypes.filter((t) => !group.types.includes(t))
      : [...new Set([...selectedTypes, ...group.types])];
    commit(next);
  };

  const clearAll = () => onChange("all");

  return (
    <div ref={wrapperRef} className="aircraft-filter-type">
      <button
        type="button"
        className="aircraft-filter-card aircraft-filter-card--select"
        data-state={open ? "open" : "closed"}
        data-active={isMultiSelect ? "true" : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by aircraft type"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="aircraft-filter-card__label">Type</span>
        <strong className="aircraft-filter-card__value">{displayValue}</strong>
      </button>
      {open && panelStyle && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          className="aircraft-filter-type-panel"
          style={panelStyle}
          role="listbox"
          aria-multiselectable="true"
        >
          <button
            type="button"
            className="aircraft-filter-type-row aircraft-filter-type-row--all"
            data-selected={!isMultiSelect ? "true" : undefined}
            onClick={clearAll}
          >
            <span className="aircraft-filter-type-row__check">
              {!isMultiSelect ? <Check size={11} aria-hidden="true" /> : null}
            </span>
            <span className="aircraft-filter-type-row__label">All</span>
          </button>
          {groups.map((group) => {
            const groupSelectedCount = group.types.filter((t) =>
              selectedSet.has(t),
            ).length;
            const allSelected = groupSelectedCount === group.types.length;
            const partialSelected =
              groupSelectedCount > 0 && !allSelected;
            return (
              <div key={group.category} className="aircraft-filter-type-group">
                <button
                  type="button"
                  className="aircraft-filter-type-row aircraft-filter-type-row--header"
                  data-selected={allSelected ? "true" : undefined}
                  data-partial={partialSelected ? "true" : undefined}
                  onClick={() => toggleGroup(group)}
                >
                  <span className="aircraft-filter-type-row__check">
                    {allSelected ? (
                      <Check size={11} aria-hidden="true" />
                    ) : partialSelected ? (
                      <Minus size={11} aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="aircraft-filter-type-row__label">
                    {group.label}
                  </span>
                  <span className="aircraft-filter-type-row__count">
                    {group.types.length}
                  </span>
                </button>
                {group.types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="aircraft-filter-type-row aircraft-filter-type-row--item"
                    data-selected={selectedSet.has(type) ? "true" : undefined}
                    onClick={() => toggleType(type)}
                  >
                    <span className="aircraft-filter-type-row__check">
                      {selectedSet.has(type) ? (
                        <Check size={11} aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="aircraft-filter-type-row__label">
                      {type}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
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
