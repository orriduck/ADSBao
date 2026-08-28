import type { CSSProperties, ReactNode } from "react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  CircleDot,
  ListFilter,
  Minus,
  Plane,
  Search,
} from "lucide-react";
import {
  FilterCard,
  FilterCardGrid,
  FilterCardLabel,
  FilterCardValue,
} from "@/components/ui/FilterCard";
import {
  MenuSurface,
  MenuItem,
  MenuItemCheck,
  MenuItemLabel,
  MenuItemCount,
} from "@/components/ui/MenuPanel";
import { useExplorerFilters } from "@/components/explorer/ExplorerUiContext";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useListReorderMotion } from "@/animations/useListReorderMotion";
import {
  aircraftTypeSearchText,
  resolveAircraftDisplayModel,
} from "@/features/aircraft/aircraftTypeDisplayModel";
import {
  AIRBORNE_FILTER_OPTIONS,
  ALTITUDE_LEVEL_OPTIONS,
  ALTITUDE_LEVEL_VALUES,
  ENTITY_FILTER_OPTIONS,
  aircraftMatchesFilters,
  getNextAirborneFilter,
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
import AirportSlot from "./AirportSlot";
import VirtualNearbyList from "./VirtualNearbyList";
import PublicConcourseBoundary from "@/components/app-shell/PublicConcourseBoundary";
import { SidebarLoadingRows } from "./SidebarLoadingSkeleton";
import { shouldShowAircraftListLoading } from "@/features/aircraft/positions/aircraftLoadingOverlayModel";

type AircraftLike = Record<string, any>;
type AirportLike = Record<string, any>;

function AircraftTable({
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
  aircraftLoading = false,
}) {
  const { t } = useI18n();
  const {
    airborneFilter,
    typeFilter,
    altitudeLevel,
    entityFilter,
    setAirborneFilter,
    setTypeFilter,
    setAltitudeLevel,
    setEntityFilter,
  } = useExplorerFilters();
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
        airborneFilter,
        typeFilter,
        movementFilter,
      }),
    [
      aircraftWithDist,
      movementFilter,
      query,
      selectedAltitudeLevels,
      airborneFilter,
      typeFilter,
    ],
  );

  const filteredAirports = useMemo(() => {
    if (entityFilter === "aircraft") return [];
    if (airborneFilter !== "all") return [];
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
  }, [airborneFilter, airports, entityFilter, movementFilter, query]);

  const filteredAircraft = useMemo(() => {
    if (entityFilter === "airports") return [];
    return rows;
  }, [rows, entityFilter]);
  const hasRouteEndpointAirports = useMemo(
    () => filteredAirports.some((airport) => airport?.routeEndpointRole),
    [filteredAirports],
  );
  const endpointAirportRows = hasRouteEndpointAirports ? filteredAirports : [];
  // Selecting an aircraft highlights its row in place (data-selected styling).
  // It is no longer hoisted into a pinned header slot — that reorder cost a
  // list reflow on every selection, and the in-place focus reads clearly enough.
  const listRows = filteredAircraft;
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
  const hasEmptyResults =
    listRows.length === 0 && filteredAirports.length === 0;
  const showAircraftListLoading = shouldShowAircraftListLoading({
    aircraftLoading,
    aircraftCount: aircraft.length,
    entityFilter,
  });

  const aircraftListResetKey = useMemo(
    () =>
      [
        query.trim().toLowerCase(),
        airborneFilter,
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
      airborneFilter,
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
      className="aircraft-table-shell flex flex-col"
      data-empty-results={hasEmptyResults ? "true" : undefined}
      data-aircraft-loading={showAircraftListLoading ? "true" : undefined}
    >
      <div className="aircraft-table-controls flex-none">
        <div className="aircraft-table-search-bar">
          <label className="search-input wayfinding-search flex min-h-11 items-stretch p-0">
            <span
              className="flex w-[var(--airport-wayfinding-rail-width)] shrink-0 items-center justify-center overflow-hidden bg-[var(--airport-wayfinding-neutral-rail)] text-[var(--airport-wayfinding-neutral-rail-fg)]"
              data-motion-kind="search"
              data-motion-rail="true"
            >
              <span className="wayfinding-rail-glyph inline-flex">
                <Search className="size-[16px] stroke-[1.8]" aria-hidden="true" />
              </span>
            </span>
            <span className="flex min-w-0 flex-1 items-center bg-[var(--airport-wayfinding-content)] px-3">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-7 min-w-0 flex-1 p-0 text-[calc(12px*var(--sb-body-scale))] tracking-normal text-atc-text"
                placeholder={t("sidebar.searchPlaceholder")}
                aria-label={t("sidebar.searchAria")}
              />
            </span>
          </label>
        </div>

        <div className="aircraft-table-filter-shell">
          <FilterCardGrid columns={2} aria-label={t("sidebar.filtersAria")}>
            <EntityFilterCycleCard
              icon={<ListFilter />}
              label={t("sidebar.targets")}
              value={entityFilter}
              onValueChange={() =>
                setEntityFilter(getNextEntityFilter(entityFilter))
              }
              options={ENTITY_FILTER_OPTIONS}
              ariaLabel={t("filters.showAria")}
            />

            <EntityFilterCycleCard
              icon={<CircleDot />}
              label={t("sidebar.status")}
              value={airborneFilter}
              onValueChange={() =>
                setAirborneFilter(getNextAirborneFilter(airborneFilter))
              }
              options={AIRBORNE_FILTER_OPTIONS}
              ariaLabel={t("filters.airborneFilterAria")}
            />

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
        </div>

        <div className="aircraft-table-controls-header">
          <span aria-hidden="true" className="aircraft-table-controls-header__rail" />
          <div className="aircraft-table-controls-header__content">
            <span className="atc-kicker atc-kicker--lead">
              {t("sidebar.targets")}
            </span>
            <div className="whitespace-nowrap font-mono text-[calc(8px*var(--sb-body-scale))] tracking-normal text-atc-dim tabular-nums">
              <span>{filteredAircraft.length + filteredAirports.length}</span>
              <span> / </span>
              <span>
                {aircraft.length + airports.length} {t("sidebar.nearby")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="aircraft-table-list-card flex flex-col">
        {endpointAirportRows.length > 0 ? (
          <ul>
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

        <div className="aircraft-table-scroll-shell overflow-visible">
          {showAircraftListLoading ? (
            <div role="status" aria-label={t("map.loadingAircraftAria")}>
              <SidebarLoadingRows />
            </div>
          ) : hasEmptyResults ? (
            <div className="aircraft-table-empty-state app-panel-transition px-[var(--airport-sidebar-inset)] py-6 text-center text-[calc(10px*var(--sb-body-scale))] uppercase tracking-normal text-atc-faint">
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
                  className="app-list-motion"
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
        <PublicConcourseBoundary className="public-concourse-boundary--nearby" />
      </div>
    </div>
  );
}

// The four filter cells share one label-over-value structure. Dropdown cells
// end in a small chevron. The value row stretches
// across the card so all labels and values keep one clean left axis while the
// chevrons land on one right axis.
function FilterPillValue({
  children,
  dropdown = true,
}: {
  children: ReactNode;
  dropdown?: boolean;
}) {
  return (
    <span className="flex w-full items-center justify-between gap-1 justify-self-stretch">
      <FilterCardValue>{children}</FilterCardValue>
      {dropdown ? (
        <ChevronDown
          aria-hidden="true"
          strokeWidth={2.5}
          className="size-2.5 shrink-0 text-atc-faint [[data-active=true]_&]:text-atc-dim [[data-state=open]_&]:text-atc-dim"
        />
      ) : null}
    </span>
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
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { capture: true, passive: true });
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
        icon={<Plane />}
        shape="select"
        contentLayout="split"
        data-state={open ? "open" : "closed"}
        active={isMultiSelect}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("filters.aircraftFilterAria")}
        onClick={() => setOpen((value) => !value)}
      >
        <FilterCardLabel>{t("sidebar.aircraftType")}</FilterCardLabel>
        <FilterPillValue>{displayValue}</FilterPillValue>
      </FilterCard>
      {open && panelStyle && typeof document !== "undefined" && createPortal(
        <MenuSurface
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
                          className="notranslate min-w-0 truncate font-mono text-[calc(9px*var(--sb-body-scale))] uppercase tracking-normal text-atc-faint"
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
        </MenuSurface>,
        document.body,
      )}
    </div>
  );
}

function EntityFilterCycleCard({
  icon,
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
      icon={icon}
      active={value !== "all"}
      contentLayout="split"
      aria-label={ariaLabel}
      onClick={onValueChange}
    >
      <FilterCardLabel>{label}</FilterCardLabel>
      <FilterPillValue>{displayValue}</FilterPillValue>
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
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { capture: true, passive: true });
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
        icon={<ArrowUpDown />}
        shape="select"
        contentLayout="split"
        data-state={open ? "open" : "closed"}
        active={!allSelected}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <FilterCardLabel>{label}</FilterCardLabel>
        <FilterPillValue>{displayValue}</FilterPillValue>
      </FilterCard>
      {open && panelStyle && typeof document !== "undefined" && createPortal(
        <MenuSurface
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
        </MenuSurface>,
        document.body,
      )}
    </div>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function filterAndSortAircraft({
  aircraft = [],
  altitudeLevel = [],
  query = "",
  airborneFilter = "all",
  typeFilter = "all",
  movementFilter = "all",
}: {
  aircraft?: AircraftLike[];
  altitudeLevel?: string | string[];
  query?: string;
  airborneFilter?: string;
  typeFilter?: any;
  movementFilter?: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return [...aircraft]
    .filter((item) =>
      aircraftMatchesFilters(item, {
        airborneFilter,
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

// memo 化容器:配合 useExplorerFilters() 切片订阅,使无关的高频更新(mapZoom、图层
// 开关、sidebar、mapSettings)在父组件级联重渲染时被浅比较拦下——AircraftTable 只在
// 自身 props(aircraft / 选中 / focus)或筛选状态变化时才重新渲染这条最热的列表。
export default memo(AircraftTable);
