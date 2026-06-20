import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FilterCard,
  FilterCardGrid,
  FilterCardLabel,
  FilterCardValue,
} from "@/components/ui/FilterCard";
import {
  MenuPanel,
  MenuItem,
  MenuItemCheck,
  MenuItemLabel,
  MenuItemCount,
} from "@/components/ui/MenuPanel";
import { cn } from "@/lib/utils";
import { useExplorerUi } from "@/components/explorer/ExplorerUiContext";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useListReorderMotion } from "@/animations/useListReorderMotion";
import {
  aircraftTypeSearchText,
  resolveAircraftDisplayModel,
} from "@/features/aircraft/aircraftTypeDisplayModel";
import {
  ALTITUDE_LEVEL_OPTIONS,
  ALTITUDE_LEVEL_VALUES,
  ENTITY_FILTER_OPTIONS,
  aircraftMatchesFilters,
  getAircraftTypeGroups,
  getNextEntityFilter,
  isAltitudeSelectionAll,
  normalizeAltitudeLevelSelection,
} from "@/features/aircraft/filters/aircraftFilters";
import {
  getAircraftContextGroup,
  getAircraftIdentity,
  getContextTagLabel,
} from "../../features/airport/context/airportContextUiModel";
import { formatFlightRouteMunicipalityLabel } from "../../utils/flightRouteDisplay";
import { getDistanceNm } from "../../utils/aircraftTrafficIntent";
import AircraftList from "./AircraftList";
import AircraftSlot from "./AircraftSlot";
import AirportSlot from "./AirportSlot";
import VirtualNearbyList from "./VirtualNearbyList";

type AircraftLike = Record<string, any>;
type AirportLike = Record<string, any>;

export default function AircraftTable({
  aircraft = [],
  airports = [],
  focusLat = null,
  focusLon = null,
  selectedAircraftId = "",
  suppressedAircraftDistanceId = "",
  selectedAirportIcao = "",
  movementFilter = "all",
  onSelectAircraft,
  onSelectAirport,
  suppressSelectedAircraftDistance = false,
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
  const selectedAltitudeLevels = useMemo(
    () => normalizeAltitudeLevelSelection(altitudeLevel),
    [altitudeLevel],
  );
  const typeGroups = useMemo(
    () => getAircraftTypeGroups(aircraft, selectedTypes),
    [aircraft, selectedTypes],
  );
  // Aircraft entries enriched with a distanceNm relative to the focus
  // point (focal aircraft or airport). Recompute from the current focus
  // because an existing distance may have been produced for a different
  // sidebar context.
  const aircraftWithDist = useMemo(() => {
    const shouldSuppressSelectedDistance = (item) =>
      suppressSelectedAircraftDistance &&
      [selectedAircraftId, suppressedAircraftDistanceId]
        .filter(Boolean)
        .includes(getAircraftIdentity(item));

    return aircraft.map((item) => {
      if (shouldSuppressSelectedDistance(item)) {
        return { ...item, distanceNm: undefined };
      }
      if (focusLat == null || focusLon == null) return item;
      const computed = getDistanceNm(focusLat, focusLon, item?.lat, item?.lon);
      if (computed == null) return item;
      return { ...item, distanceNm: computed };
    });
  }, [
    aircraft,
    focusLat,
    focusLon,
    selectedAircraftId,
    suppressedAircraftDistanceId,
    suppressSelectedAircraftDistance,
  ]);

  const rows = useMemo(
    () =>
      filterAndSortAircraft({
        aircraft: aircraftWithDist,
        altitudeLevel: selectedAltitudeLevels,
        query,
        trafficFilter,
        typeFilter,
        movementFilter,
      }),
    [
      aircraftWithDist,
      movementFilter,
      query,
      selectedAltitudeLevels,
      trafficFilter,
      typeFilter,
    ],
  );

  const filteredAirports = useMemo(() => {
    if (entityFilter === "aircraft") return [];
    if (movementFilter !== "all") return [];
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
  }, [airports, entityFilter, movementFilter, query]);

  const filteredAircraft = useMemo(() => {
    if (entityFilter === "airports") return [];
    return rows;
  }, [rows, entityFilter]);
  const hasRouteEndpointAirports = useMemo(
    () => filteredAirports.some((airport) => airport?.routeEndpointRole),
    [filteredAirports],
  );
  const endpointAirportRows = hasRouteEndpointAirports ? filteredAirports : [];
  // Pinned aircraft sits above the scrolling list and stays visible even
  // when filters would otherwise exclude it. Look in the full nearby set,
  // not the filtered rows, so a user can keep watching a selection without
  // losing it to a stray filter toggle.
  const pinnedAircraft = useMemo(() => {
    if (!selectedAircraftId) return null;
    return (
      aircraftWithDist.find(
        (item) => getAircraftIdentity(item) === selectedAircraftId,
      ) ||
      null
    );
  }, [aircraftWithDist, selectedAircraftId]);
  // Don't duplicate the pinned aircraft inside the scroll list.
  const listRows = useMemo(() => {
    if (!pinnedAircraft) return filteredAircraft;
    return filteredAircraft.filter(
      (item) => getAircraftIdentity(item) !== selectedAircraftId,
    );
  }, [pinnedAircraft, filteredAircraft, selectedAircraftId]);
  const combinedRows = useMemo(() => {
    const out = [];
    for (const aircraftItem of listRows) {
      const id = getAircraftIdentity(aircraftItem);
      out.push({
        type: "aircraft",
        id: id || `aircraft-idx:${out.length}`,
        data: aircraftItem,
      });
    }
    if (hasRouteEndpointAirports) return out;
    for (const airport of filteredAirports) {
      out.push({
        type: "airport",
        id: `airport:${airport.icao}`,
        data: airport,
      });
    }
    return out;
  }, [filteredAirports, hasRouteEndpointAirports, listRows]);

  const aircraftListResetKey = useMemo(
    () =>
      [
        query.trim().toLowerCase(),
        trafficFilter,
        Array.isArray(typeFilter) ? typeFilter.join("|") : typeFilter,
        selectedAltitudeLevels.join("|"),
        entityFilter,
        movementFilter,
      ].join("::"),
    [
      entityFilter,
      movementFilter,
      query,
      selectedAltitudeLevels,
      trafficFilter,
      typeFilter,
    ],
  );
  const airportListMotionRef = useRef<HTMLUListElement | null>(null);
  const airportListMotionKey = useMemo(
    () =>
      filteredAirports
        .map((airport, index) => `airport:${airport.icao || index}`)
        .join("|"),
    [filteredAirports],
  );
  useListReorderMotion(airportListMotionRef, airportListMotionKey, {
    resetKey: aircraftListResetKey,
  });

  return (
    <div
      data-has-pinned-aircraft={pinnedAircraft ? "true" : undefined}
      className={cn("aircraft-table-shell flex flex-col", fill && "h-full")}
    >
      <div className="aircraft-table-controls flex-none">
        <div className="flex items-baseline justify-between px-[var(--airport-sidebar-inset)] pt-4 pb-2.5">
          <span className="atc-kicker atc-kicker--lead">
            {entityFilter === "airports" ? t("sidebar.airports") : t("sidebar.flights")}
          </span>
          <div className="whitespace-nowrap font-mono text-[10px] tracking-[0.18em] text-atc-dim tabular-nums">
            <span>{filteredAircraft.length + filteredAirports.length}</span>
            <span> / </span>
            <span>
              {aircraft.length + airports.length} {t("sidebar.nearby")}
            </span>
          </div>
        </div>

        <div className="aircraft-table-search-bar px-[var(--airport-sidebar-inset)] pb-3">
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

        <FilterCardGrid columns={2} aria-label={t("sidebar.filtersAria")}>
          <EntityFilterCycleCard
            label={t("sidebar.targets")}
            value={entityFilter}
            onValueChange={() =>
              setEntityFilter(getNextEntityFilter(entityFilter))
            }
            options={ENTITY_FILTER_OPTIONS}
            ariaLabel={t("filters.showAria")}
          />

          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <FilterCard
                  active={trafficFilter === "routed"}
                  aria-pressed={trafficFilter === "routed"}
                  onClick={() =>
                    setTrafficFilter(
                      trafficFilter === "routed" ? "all" : "routed",
                    )
                  }
                >
                  <FilterCardLabel>{t("sidebar.route")}</FilterCardLabel>
                  <FilterCardValue>
                    {trafficFilter === "routed" ? t("sidebar.routed") : t("sidebar.all")}
                  </FilterCardValue>
                </FilterCard>
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
          <AircraftAltitudeFilterCard
            label={t("sidebar.altitudeFilter")}
            selectedLevels={selectedAltitudeLevels}
            onChange={setAltitudeLevel}
            ariaLabel={t("filters.altitudeFilterAria")}
          />
        </FilterCardGrid>

        <div className="aircraft-table-header aircraft-table-row-grid grid grid-cols-[18px_minmax(0,1fr)_48px_54px] items-center gap-2 border-b border-[var(--atc-line)] px-[var(--airport-sidebar-inset)] py-1.5 font-mono text-[9px] uppercase text-atc-faint sm:grid-cols-[18px_minmax(0,1fr)_54px_70px] sm:gap-3">
          <span aria-hidden="true" />
          <span>{t("sidebar.callsignOrRoute")}</span>
          <NumericHeader>{t("sidebar.distance")}</NumericHeader>
          <NumericHeader>
            {hasRouteEndpointAirports ? t("sidebar.endpoint") : t("sidebar.altitude")}
          </NumericHeader>
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
        {endpointAirportRows.length > 0 ? (
          <ul className="divide-y divide-atc-line border-t border-atc-line">
            {endpointAirportRows.map((airport, index) => (
              <li
                key={`endpoint-airport:${airport.icao || index}`}
                className="relative list-none [perspective:800px]"
              >
                <AirportSlot
                  airport={airport}
                  cascadeOrder={index}
                  airportId={airport.icao}
                  selected={airport.icao === selectedAirportIcao}
                  onSelectAirport={onSelectAirport}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        className={cn(
          "aircraft-table-scroll-shell",
          fill ? "flex-1 min-h-0" : "overflow-visible",
        )}
      >
        {listRows.length === 0 &&
        filteredAirports.length === 0 &&
        !pinnedAircraft ? (
          <div className="app-panel-transition px-[var(--airport-sidebar-inset)] py-8 text-center text-[11px] font-semibold uppercase tracking-normal text-atc-faint">
            {aircraft.length + airports.length
              ? t("sidebar.noMatches")
              : t("sidebar.nothingInRange")}
          </div>
        ) : fill ? (
          <VirtualNearbyList
            items={combinedRows}
            selectedAircraftId={selectedAircraftId}
            selectedAirportIcao={selectedAirportIcao}
            onSelectAircraft={onSelectAircraft}
            onSelectAirport={onSelectAirport}
            resetSignal={aircraftListResetKey}
          />
        ) : (
          <>
            {listRows.length > 0 && (
              <AircraftList
                aircraft={listRows}
                resetKey={aircraftListResetKey}
                selectedAircraftId={selectedAircraftId}
                onSelectAircraft={onSelectAircraft}
              />
            )}
            {filteredAirports.length > 0 && (
              <ul
                ref={airportListMotionRef}
                className="app-list-motion divide-y divide-atc-line"
              >
                {filteredAirports.map((airport, index) => {
                  const motionStyle = {
                    "--motion-order": Math.min(index, 5),
                  } as CSSProperties;
                  return (
                    <li
                      key={`airport:${airport.icao}`}
                      data-gsap-reorder-key={`airport:${airport.icao || index}`}
                      className="relative list-none [perspective:800px]"
                      style={motionStyle}
                    >
                      <AirportSlot
                        airport={airport}
                        cascadeOrder={-1}
                        airportId={airport.icao}
                        selected={airport.icao === selectedAirportIcao}
                        onSelectAirport={onSelectAirport}
                      />
                    </li>
                  );
                })}
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
    if (selectedTypes.length === 1) {
      return resolveAircraftDisplayModel({ type: selectedTypes[0] }).displayName;
    }
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
    const groupValues = group.types.map((type) => type.value);
    const allSelected = groupValues.every((value) => selectedSet.has(value));
    const next = allSelected
      ? selectedTypes.filter((type) => !groupValues.includes(type))
      : [...new Set([...selectedTypes, ...groupValues])];
    commit(next);
  };

  const clearAll = () => onChange("all");

  return (
    <div ref={wrapperRef} className="relative">
      <FilterCard
        shape="select"
        data-state={open ? "open" : "closed"}
        active={isMultiSelect}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("filters.aircraftFilterAria")}
        onClick={() => setOpen((value) => !value)}
      >
        <FilterCardLabel>{t("sidebar.aircraftType")}</FilterCardLabel>
        <FilterCardValue>{displayValue}</FilterCardValue>
      </FilterCard>
      {open && panelStyle && typeof document !== "undefined" && createPortal(
        <MenuPanel
          ref={panelRef}
          style={panelStyle}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-popover max-h-[320px] overflow-y-auto"
        >
          <MenuItem
            selected={!isMultiSelect}
            onClick={clearAll}
          >
            <MenuItemCheck>
              {!isMultiSelect ? <Check size={11} aria-hidden="true" /> : null}
            </MenuItemCheck>
            <MenuItemLabel>{t("sidebar.all")}</MenuItemLabel>
          </MenuItem>
          {groups.map((group) => {
            const groupSelectedCount = group.types.filter((type) =>
              selectedSet.has(type.value),
            ).length;
            const allSelected = groupSelectedCount === group.types.length;
            const partialSelected =
              groupSelectedCount > 0 && !allSelected;
            return (
              // Spacing gap between groups — 4px top margin on every
              // group after the first. Lives inline so adjusting
              // dropdown rhythm only touches this one className.
              <div key={group.category} className="[&:not(:first-of-type)]:mt-1">
                <MenuItem
                  variant="header"
                  selected={allSelected}
                  partial={partialSelected}
                  onClick={() => toggleGroup(group)}
                >
                  <MenuItemCheck>
                    {allSelected ? (
                      <Check size={11} aria-hidden="true" />
                    ) : partialSelected ? (
                      <Minus size={11} aria-hidden="true" />
                    ) : null}
                  </MenuItemCheck>
                  <MenuItemLabel>
                    {group.labelKey ? t(group.labelKey) : group.label}
                  </MenuItemLabel>
                  <MenuItemCount>{group.types.length}</MenuItemCount>
                </MenuItem>
                {group.types.map((type) => (
                  <MenuItem
                    key={type.value}
                    selected={selectedSet.has(type.value)}
                    onClick={() => toggleType(type.value)}
                    // Indent type rows under their group header.
                    className="[&_[data-ui=menu-label]]:pl-2"
                  >
                    <MenuItemCheck>
                      {selectedSet.has(type.value) ? (
                        <Check size={11} aria-hidden="true" />
                      ) : null}
                    </MenuItemCheck>
                    <MenuItemLabel
                      data-ui="menu-label"
                      className="flex min-w-0 flex-col gap-0.5"
                    >
                      <span className="min-w-0 truncate">{type.label}</span>
                      {type.icaoType && type.icaoType !== type.label ? (
                        <span
                          className="notranslate min-w-0 truncate font-mono text-[9px] font-medium uppercase tracking-normal text-atc-faint"
                          translate="no"
                        >
                          {type.icaoType}
                        </span>
                      ) : null}
                    </MenuItemLabel>
                  </MenuItem>
                ))}
              </div>
            );
          })}
        </MenuPanel>,
        document.body,
      )}
    </div>
  );
}

function EntityFilterCycleCard({
  label,
  value,
  onValueChange,
  options,
  ariaLabel,
}) {
  const { t } = useI18n();
  const option = options.find((item) => item.value === value) || options[0];
  const displayValue = option?.labelKey ? t(option.labelKey) : option?.label;
  return (
    <FilterCard
      active={value !== "all"}
      aria-label={ariaLabel}
      onClick={onValueChange}
    >
      <FilterCardLabel>{label}</FilterCardLabel>
      <FilterCardValue>{displayValue}</FilterCardValue>
    </FilterCard>
  );
}

function AircraftAltitudeFilterCard({
  label,
  selectedLevels,
  onChange,
  ariaLabel,
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const selectedSet = useMemo(() => new Set(selectedLevels), [selectedLevels]);
  const allSelected = isAltitudeSelectionAll(selectedLevels);
  const resolveLabel = (option) =>
    option.labelKey ? t(option.labelKey) : option.label;
  const selectedOption =
    selectedLevels.length === 1
      ? ALTITUDE_LEVEL_OPTIONS.find((item) => item.value === selectedLevels[0])
      : null;
  const displayValue = allSelected
    ? t("sidebar.all")
    : selectedOption
      ? resolveLabel(selectedOption)
      : t("sidebar.altitudeLayersMultiple");

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

  const commit = (next) => {
    onChange(next.length > 0 ? next : [...ALTITUDE_LEVEL_VALUES]);
  };

  const selectAll = () => commit([...ALTITUDE_LEVEL_VALUES]);

  const toggleLevel = (level) => {
    const next = selectedSet.has(level)
      ? selectedLevels.filter((item) => item !== level)
      : [...selectedLevels, level];
    commit(next);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <FilterCard
        shape="select"
        data-state={open ? "open" : "closed"}
        active={!allSelected}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <FilterCardLabel>{label}</FilterCardLabel>
        <FilterCardValue>{displayValue}</FilterCardValue>
      </FilterCard>
      {open && panelStyle && typeof document !== "undefined" && createPortal(
        <MenuPanel
          ref={panelRef}
          style={panelStyle}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-popover max-h-[320px] gap-1 overflow-y-auto"
        >
          <MenuItem selected={allSelected} onClick={selectAll}>
            <MenuItemCheck>
              {allSelected ? <Check size={11} aria-hidden="true" /> : null}
            </MenuItemCheck>
            <MenuItemLabel>{t("sidebar.all")}</MenuItemLabel>
          </MenuItem>
          {ALTITUDE_LEVEL_OPTIONS.map((option) => {
            const selected = selectedSet.has(option.value);
            return (
              <MenuItem
                key={option.value}
                selected={selected}
                onClick={() => toggleLevel(option.value)}
              >
                <MenuItemCheck>
                  {selected ? <Check size={11} aria-hidden="true" /> : null}
                </MenuItemCheck>
                <MenuItemLabel>{resolveLabel(option)}</MenuItemLabel>
              </MenuItem>
            );
          })}
        </MenuPanel>,
        document.body,
      )}
    </div>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Header cell that mirrors the row's NumberWithUnit 2-column sub-grid (number
// column + small unit-suffix column). Without this, the header text right-
// aligns to the cell's edge but row values right-align inside the inner grid,
// so the header sits ~14px to the right of every value.
function NumericHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid w-full grid-cols-[minmax(0,1fr)_var(--aircraft-table-unit-width,14px)] items-baseline gap-x-0.5">
      <span className="block min-w-0 text-right">{children}</span>
      <span aria-hidden="true" />
    </span>
  );
}

function filterAndSortAircraft({
  aircraft = [],
  altitudeLevel = [],
  query = "",
  trafficFilter = "all",
  typeFilter = "all",
  movementFilter = "all",
}: {
  aircraft?: AircraftLike[];
  altitudeLevel?: string | string[];
  query?: string;
  trafficFilter?: string;
  typeFilter?: any;
  movementFilter?: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return [...aircraft]
    .filter((item) =>
      aircraftMatchesFilters(item, {
        trafficFilter,
        typeFilter,
        altitudeLevel,
        movementFilter,
      }),
    )
    .filter((item) =>
      normalizedQuery ? aircraftSearchText(item).includes(normalizedQuery) : true,
    )
    .sort(sortAircraftByAltitude);
}

function airportSearchText(airport: AirportLike = {}) {
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

function aircraftSearchText(aircraft: AircraftLike = {}) {
  const routeMunicipalities = formatFlightRouteMunicipalityLabel(
    aircraft.flightRoute,
  );

  return [
    aircraft.callsign,
    aircraft.icao24,
    aircraft.registration,
    aircraftTypeSearchText(aircraft),
    aircraft.flightRouteLabel,
    routeMunicipalities,
    getAircraftContextGroup(aircraft),
    getContextTagLabel(aircraft),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortAircraftByAltitude(a: AircraftLike, b: AircraftLike) {
  const altitudeDelta = altitudeSortValue(b) - altitudeSortValue(a);
  if (altitudeDelta !== 0) return altitudeDelta;

  const speedDelta = (toNumber(b.velocity) ?? -1) - (toNumber(a.velocity) ?? -1);
  if (speedDelta !== 0) return speedDelta;

  return getAircraftIdentity(a).localeCompare(getAircraftIdentity(b));
}

function altitudeSortValue(aircraft: AircraftLike = {}) {
  if (aircraft.onGround) return -1;
  return toNumber(aircraft.altitude) ?? -2;
}
