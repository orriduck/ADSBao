import {
  Antenna,
  ArrowDownToLine,
  ArrowUpToLine,
  ChartNoAxesColumnIncreasing,
  ChartScatter,
  Coffee,
  Crosshair,
  Gauge,
  Layers,
  ListFilter,
  LocateFixed,
  Map as MapIcon,
  MapPinned,
  Monitor,
  MonitorCheck,
  Moon,
  Mountain,
  PanelsTopLeft,
  Plane,
  PlaneLanding,
  Radar,
  Route,
  ScanSearch,
  ShieldAlert,
  SlidersHorizontal,
  Spotlight,
  Sun,
  Telescope,
  Text,
  Type,
  TowerControl,
  Waypoints,
} from "lucide-react";

export function MapControlIcon({ iconKey }) {
  switch (iconKey) {
    case "antenna":
      return <Antenna />;
    case "arrowDownToLine":
      return <ArrowDownToLine />;
    case "arrowUpToLine":
      return <ArrowUpToLine />;
    case "chartNoAxesColumnIncreasing":
      return <ChartNoAxesColumnIncreasing />;
    case "chartScatter":
      return <ChartScatter />;
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
    case "map":
      return <MapIcon />;
    case "mapPinned":
      return <MapPinned />;
    case "monitorCheck":
      return <MonitorCheck />;
    case "coffee":
      return <Coffee />;
    case "moon":
      return <Moon />;
    case "mountain":
      return <Mountain />;
    case "panelsTopLeft":
      return <PanelsTopLeft />;
    case "plane":
      return <Plane />;
    case "planeLanding":
      return <PlaneLanding />;
    case "radar":
      return <Radar />;
    case "route":
      return <Route />;
    case "scanSearch":
      return <ScanSearch />;
    case "shieldAlert":
      return <ShieldAlert />;
    case "spotlight":
      return <Spotlight />;
    case "sun":
      return <Sun />;
    case "telescope":
      return <Telescope />;
    case "text":
      return <Text />;
    case "towerControl":
      return <TowerControl />;
    case "type":
      return <Type />;
    case "waypoints":
      return <Waypoints />;
    case "slidersHorizontal":
    default:
      return <SlidersHorizontal />;
  }
}
