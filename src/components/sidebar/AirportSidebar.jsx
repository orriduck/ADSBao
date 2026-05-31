"use client";

import { useState } from "react";
import AircraftTable from "./AircraftTable";
import AirportIdentity from "./AirportIdentity";
import SidebarShell from "./SidebarShell";
import SidebarViewSwitch from "./SidebarViewSwitch";
import WeatherBriefingStack from "./WeatherBriefingStack";

export default function AirportSidebar({
  icao = "",
  iata = "",
  name = "",
  localizedName = "",
  city = "",
  country = "",
  lat = 0,
  lon = 0,
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  aircraft = [],
  airports = [],
  focusLat = null,
  focusLon = null,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  lastUpdated = null,
  feedStatus = "live",
  feedSource = "",
  routeProvider = "",
  loadingStatus = "",
  onSelectAircraft,
  onSelectAirport,
  onBack,
  onMap = null,
  onClose = null,
}) {
  const isMobileOverlay = Boolean(onClose);
  const [activeView, setActiveView] = useState("traffic");

  const header = (
    <>
      <AirportIdentity
        icao={icao}
        iata={iata}
        name={name}
        localizedName={localizedName}
        city={city}
        country={country}
        lat={lat}
        lon={lon}
      />
      <SidebarViewSwitch
        activeView={activeView}
        onViewChange={setActiveView}
        metar={metar}
        aircraft={aircraft}
        routeProvider={routeProvider}
      />
    </>
  );

  return (
    <SidebarShell
      variant="airport"
      feedStatus={feedStatus}
      feedSource={feedSource}
      lastUpdated={lastUpdated}
      loadingStatus={loadingStatus}
      onBack={onBack}
      onMap={onMap}
      onClose={onClose}
      header={header}
    >
      {activeView === "briefing" ? (
        <WeatherBriefingStack
          icao={icao}
          iata={iata}
          name={name}
          city={city}
          country={country}
          metar={metar}
          metarRaw={metarRaw}
          metarLoading={metarLoading}
          metarError={metarError}
          airportCode={iata || icao}
          airportLat={lat}
          airportLon={lon}
        />
      ) : (
        <AircraftTable
          aircraft={aircraft}
          airports={airports}
          focusLat={focusLat}
          focusLon={focusLon}
          selectedAircraftId={selectedAircraftId}
          selectedAirportIcao={selectedAirportIcao}
          onSelectAircraft={onSelectAircraft}
          onSelectAirport={onSelectAirport}
          fill={!isMobileOverlay}
        />
      )}
    </SidebarShell>
  );
}
