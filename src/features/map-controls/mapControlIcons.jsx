"use client";

import {
  AudioLines,
  Crosshair,
  Gauge,
  Monitor,
  Moon,
  PlaneLanding,
  SlidersHorizontal,
  Sun,
  TowerControl,
  Type,
} from "lucide-react";

export const MAP_CONTROL_ICONS = {
  audioLines: AudioLines,
  crosshair: Crosshair,
  gauge: Gauge,
  monitor: Monitor,
  moon: Moon,
  planeLanding: PlaneLanding,
  slidersHorizontal: SlidersHorizontal,
  sun: Sun,
  towerControl: TowerControl,
  type: Type,
};

export const getMapControlIcon = (iconKey) =>
  MAP_CONTROL_ICONS[iconKey] || SlidersHorizontal;

export function MapControlIcon({ iconKey }) {
  switch (iconKey) {
    case "audioLines":
      return <AudioLines />;
    case "crosshair":
      return <Crosshair />;
    case "gauge":
      return <Gauge />;
    case "monitor":
      return <Monitor />;
    case "moon":
      return <Moon />;
    case "planeLanding":
      return <PlaneLanding />;
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
