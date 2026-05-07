"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  AudioLines,
  Badge,
  Crosshair,
  Gauge,
  Layers,
  ListFilter,
  Monitor,
  Moon,
  Plane,
  PlaneLanding,
  Radar,
  Route,
  SlidersHorizontal,
  Spotlight,
  Sun,
  Type,
  Waypoints,
} from "lucide-react";

export const MAP_CONTROL_ICONS = {
  arrowDownToLine: ArrowDownToLine,
  arrowUpToLine: ArrowUpToLine,
  audioLines: AudioLines,
  badge: Badge,
  crosshair: Crosshair,
  gauge: Gauge,
  layers: Layers,
  listFilter: ListFilter,
  monitor: Monitor,
  moon: Moon,
  plane: Plane,
  planeLanding: PlaneLanding,
  radar: Radar,
  route: Route,
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
    case "arrowDownToLine":
      return <ArrowDownToLine />;
    case "arrowUpToLine":
      return <ArrowUpToLine />;
    case "audioLines":
      return <AudioLines />;
    case "badge":
      return <Badge />;
    case "crosshair":
      return <Crosshair />;
    case "gauge":
      return <Gauge />;
    case "layers":
      return <Layers />;
    case "listFilter":
      return <ListFilter />;
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
