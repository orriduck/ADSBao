"use client";

import {
  Antenna,
  ArrowDownToLine,
  ArrowUpToLine,
  Crosshair,
  Gauge,
  Layers,
  ListFilter,
  LocateFixed,
  MapPinned,
  Monitor,
  Moon,
  Plane,
  PlaneLanding,
  Radar,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  Spotlight,
  Sun,
  Type,
  Waypoints,
} from "lucide-react";

export const MAP_CONTROL_ICONS = {
  antenna: Antenna,
  arrowDownToLine: ArrowDownToLine,
  arrowUpToLine: ArrowUpToLine,
  crosshair: Crosshair,
  gauge: Gauge,
  layers: Layers,
  listFilter: ListFilter,
  locateFixed: LocateFixed,
  mapPinned: MapPinned,
  monitor: Monitor,
  moon: Moon,
  plane: Plane,
  planeLanding: PlaneLanding,
  radar: Radar,
  route: Route,
  shieldAlert: ShieldAlert,
  slidersHorizontal: SlidersHorizontal,
  spotlight: Spotlight,
  sun: Sun,
  type: Type,
  waypoints: Waypoints,
};

export const getMapControlIcon = (iconKey) =>
  MAP_CONTROL_ICONS[iconKey] || SlidersHorizontal;

export function MapControlIcon({ iconKey }) {
  switch (iconKey) {
    case "antenna":
      return <Antenna />;
    case "arrowDownToLine":
      return <ArrowDownToLine />;
    case "arrowUpToLine":
      return <ArrowUpToLine />;
    case "crosshair":
      return <Crosshair />;
    case "gauge":
      return <Gauge />;
    case "layers":
      return <Layers />;
    case "listFilter":
      return <ListFilter />;
    case "locateFixed":
      return <LocateFixed />;
    case "mapPinned":
      return <MapPinned />;
    case "monitor":
      return <Monitor />;
    case "moon":
      return <Moon />;
    case "plane":
      return <Plane />;
    case "planeLanding":
      return <PlaneLanding />;
    case "radar":
      return <Radar />;
    case "route":
      return <Route />;
    case "shieldAlert":
      return <ShieldAlert />;
    case "spotlight":
      return <Spotlight />;
    case "sun":
      return <Sun />;
    case "type":
      return <Type />;
    case "waypoints":
      return <Waypoints />;
    case "slidersHorizontal":
    default:
      return <SlidersHorizontal />;
  }
}
