"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Asterisk,
  AudioLines,
  Crosshair,
  Flashlight,
  Gauge,
  Layers,
  Monitor,
  Moon,
  Plane,
  PlaneLanding,
  Radar,
  Route,
  SlidersHorizontal,
  Sun,
  TowerControl,
  Type,
} from "lucide-react";

export const MAP_CONTROL_ICONS = {
  arrowDownToLine: ArrowDownToLine,
  arrowUpToLine: ArrowUpToLine,
  asterisk: Asterisk,
  audioLines: AudioLines,
  crosshair: Crosshair,
  flashlight: Flashlight,
  gauge: Gauge,
  layers: Layers,
  monitor: Monitor,
  moon: Moon,
  plane: Plane,
  planeLanding: PlaneLanding,
  radar: Radar,
  route: Route,
  slidersHorizontal: SlidersHorizontal,
  sun: Sun,
  towerControl: TowerControl,
  type: Type,
};

export const getMapControlIcon = (iconKey) =>
  MAP_CONTROL_ICONS[iconKey] || SlidersHorizontal;

export function MapControlIcon({ iconKey }) {
  switch (iconKey) {
    case "arrowDownToLine":
      return <ArrowDownToLine />;
    case "arrowUpToLine":
      return <ArrowUpToLine />;
    case "asterisk":
      return <Asterisk />;
    case "audioLines":
      return <AudioLines />;
    case "crosshair":
      return <Crosshair />;
    case "flashlight":
      return <Flashlight />;
    case "gauge":
      return <Gauge />;
    case "layers":
      return <Layers />;
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
    case "sun":
      return <Sun />;
    case "towerControl":
      return <TowerControl />;
    case "type":
      return <Type />;
    case "slidersHorizontal":
    default:
      return <SlidersHorizontal />;
  }
}
