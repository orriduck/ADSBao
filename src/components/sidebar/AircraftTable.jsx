"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NumberFlow from "@number-flow/react";
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
import { useExplorerUi } from "@/components/explorer/ExplorerUiContext.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import {
  ALTITUDE_LEVEL_OPTIONS,
  ENTITY_FILTER_OPTIONS,
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
import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";
import AircraftList from "./AircraftList.jsx";
import AircraftSlot from "./AircraftSlot.jsx";
import AirportSlot from "./AirportSlot.jsx";

export default function AircraftTable({
  aircraft = [],
  airports = [],
  focusLat = null,
  focusLon = null,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  onSelectAircraft,
  onSelectAirport,
  fill = true,
}) {
  const { t } = useI18n();
  const {
    trafficFilter,
    typeFilter,
    altitudeLevel,
    entityFilter,
    setTrafficFilter,
    setTypeFilter,
    setAltitudeLevel,
    setEntityFilter,
  } = useExplorerUi();
  const [query, setQuery] = useState("");
  const selectedTypes = useMemo(
    () => (Array.isArray(typeFilter) ? typeFilter : []),
    [typeFilter],
  );
  const typeGroups = useMemo(
    () => getAircraftTypeGroups(aircraft, selectedTypes),
    [aircraft, selectedTypes],
  );
  // Aircraft entries enriched with a distanceNm relative to the focus
  // point (focal aircraft or airport). The airport-explorer enrichment
  // already provides distanceNm in airport-page context; for the flight
  // page we compute it on the fly here.
  const aircraftWithDist = useMemo(() => {
    if (focusLat == null || focusLon == null) return aircraft;
    return aircraft.map((item) => {
      const computed = getDistanceNm(focusLat, focusLon, item?.lat, item?.lon);
      if (computed == null) return item;
      return { ...item, distanceNm: computed };
    });
  }, [aircraft, focusLat, focusLon]);

  const rows = useMemo(
    () =>
      filterAndSortAircraft({
        aircraft: aircraftWithDist,
        altitudeLevel,
        query,
        trafficFilter,
        typeFilter,
      }),
    [aircraftWithDist, altitudeLevel, query, trafficFilter, typeFilter],
  );

  const filteredAirports = useMemo(() => {
    if (entityFilter === "aircraft") return [];
    const normalizedQuery = query.trim().toLowerCase();
    return airports
      .filter((airport) =>
        normalizedQuery
          ? airportSearchText(airport).includes(normalizedQuery)
          : true,
      )
      .toSorted(
        (left, right) => (left.distanceNm || 0) - (right.distanceNm || 0),
      );
  }, [airports, entityFilter, query]);

  const filteredAircraft = useMemo(() => {
    if (entityFilter === "airports") return [];
    return rows;
  }, [rows, entityFilter]);
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
    if (!pinnedAircraft) return filteredAircraft;
    return filteredAircraft.filter(
      (item) => getAircraftIdentity(item) !== selectedAircraftId,
    );
  }, [pinnedAircraft, filteredAircraft, selectedAircraftId]);

  return (
    <div className={`flex flex-col ${fill ? "h-full" : ""}`}>
      <div className="flex-none">
        <div className="flex items-baseline justify-between px-[var(--airport-sidebar-inset)] pt-4 pb-2.5">
          <span className="endf-label endf-label--lead">
            {entityFilter === "airports" ? t("sidebar.airports") : t("sidebar.flights")}
          </span>
          <div className="whitespace-nowrap font-mono text-[10px] tracking-[0.18em] text-atc-dim tabular-nums">
            <NumberFlow value={filteredAircraft.length + filteredAirports.length} />
            <span> / </span>
            <NumberFlow
              value={aircraft.length + airports.length}
              suffix={` ${t("sidebar.nearby")}`}
            />
          </div>
        </div>

        <div className="px-[var(--airport-sidebar-inset)] pb-3">
          <label className="aircraft-search">
            <Search size={13} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("sidebar.searchPlaceholder")}
              aria-label={t("sidebar.searchAria")}
            />
          </label>
        </div>

        <div
          className="aircraft-filter-cards aircraft-filter-cards--grid"
          role="group"
          aria-label={t("sidebar.filtersAria")}
        >
          <AircraftFilterCardSelect
            label={t("sidebar.targets")}
            value={entityFilter}
            onValueChange={setEntityFilter}
            options={ENTITY_FILTER_OPTIONS}
            ariaLabel={t("filters.showAria")}
            contentClassName="min-w-[220px]"
          />

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
                  <span className="aircraft-filter-card__label">{t("sidebar.route")}</span>
                  <strong className="aircraft-filter-card__value">
                    {trafficFilter === "routed" ? t("sidebar.routed") : t("sidebar.all")}
                  </strong>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-left">
                <strong className="block text-[11px] font-semibold uppercase tracking-wide">
                  {t("sidebar.routed")}
                </strong>
                <span className="mt-1 block text-[11px] font-normal leading-snug">
                  {t("filters.routedTooltip")}
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
            label={t("sidebar.altitudeFilter")}
            value={altitudeLevel}
            onValueChange={setAltitudeLevel}
            options={ALTITUDE_LEVEL_OPTIONS}
            ariaLabel={t("filters.altitudeFilterAria")}
            contentClassName="min-w-[220px]"
          />
        </div>

        <div className="grid grid-cols-[18px_minmax(0,1fr)_54px_70px] items-center gap-3 border-b border-[var(--atc-line)] px-[var(--airport-sidebar-inset)] py-1.5 font-mono text-[9px] uppercase text-atc-faint">
          <span aria-hidden="true" />
          <span>{t("sidebar.callsignOrRoute")}</span>
          <span className="text-right">{t("sidebar.distance")}</span>
          <span className="text-right">{t("sidebar.altitude")}</span>
        </div>

        {pinnedAircraft && (
          <div className="aircraft-table-pin">
            <AircraftSlot
              aircraft={pinnedAircraft}
              cascadeOrder={0}
              flipStaggerStep={0}
              selectedAircraftId={selectedAircraftId}
              onSelectAircraft={onSelectAircraft}
            />
          </div>
        )}
      </div>

      <div className={fill ? "flex-1 overflow-y-auto" : "overflow-visible"}>
        {listRows.length === 0 &&
        filteredAirports.length === 0 &&
        !pinnedAircraft ? (
          <div className="px-[var(--airport-sidebar-inset)] py-8 text-center text-[11px] font-semibold uppercase tracking-normal text-atc-faint">
            {aircraft.length + airports.length
              ? t("sidebar.noMatches")
              : t("sidebar.nothingInRange")}
          </div>
        ) : (
          <>
            {listRows.length > 0 && (
              <AircraftList
                aircraft={listRows}
                selectedAircraftId={selectedAircraftId}
                onSelectAircraft={onSelectAircraft}
              />
            )}
            {filteredAirports.length > 0 && (
              <ul className="aircraft-table-list">
                {filteredAirports.map((airport) => (
                  <li
                    key={`airport:${airport.icao}`}
                    className="aircraft-table-list__item"
                  >
                    <AirportSlot
                      airport={airport}
                      cascadeOrder={-1}
                      airportId={airport.icao}
                      selected={airport.icao === selectedAirportIcao}
                      onSelectAirport={onSelectAirport}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AircraftTypeFilterCard({ groups, selectedTypes, onChange }) {
  const { t } = useI18n();
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
    if (!isMultiSelect) return t("sidebar.all");
    if (selectedTypes.length === 1) return selectedTypes[0];
    return t("sidebar.typesCount", { count: selectedTypes.length });
  }, [isMultiSelect, selectedTypes, t]);

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
        aria-label={t("filters.aircraftFilterAria")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="aircraft-filter-card__label">{t("sidebar.aircraftType")}</span>
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
            <span className="aircraft-filter-type-row__label">{t("sidebar.all")}</span>
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
                    {group.labelKey ? t(group.labelKey) : group.label}
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
  const { t } = useI18n();
  const resolveLabel = (option) =>
    option.labelKey ? t(option.labelKey) : option.label;
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
              {resolveLabel(option)}
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

function airportSearchText(airport = {}) {
  return [
    airport.icao,
    airport.iata,
    airport.name,
    airport.city,
    airport.country,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
