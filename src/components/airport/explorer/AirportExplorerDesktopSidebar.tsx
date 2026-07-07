import AirportSidebar from "@/components/sidebar/AirportSidebar";
import { cn } from "@/lib/utils";

// Map-facing edge glow — same token + ~45% opacity multiplier as the
// floating toolbar's halo (Toolbar.tsx's mapKitGlow), so the sidebar's
// border picks up a hint of the current weather/time ambiance (via
// AirportExplorer overriding --app-floating-edge-shadow) without ever
// tinting the sidebar's own background or its text/icons. `isolate` +
// a negative z-index keeps the glow painting behind the actual content.
const mapKitEdgeGlow = cn(
  "[.airport-map-kit_&]:after:content-['']",
  "[.airport-map-kit_&]:after:absolute",
  "[.airport-map-kit_&]:after:inset-y-0",
  "[.airport-map-kit_&]:after:right-0",
  "[.airport-map-kit_&]:after:w-12",
  "[.airport-map-kit_&]:after:-z-10",
  "[.airport-map-kit_&]:after:opacity-[0.45]",
  "[.airport-map-kit_&]:after:pointer-events-none",
  "[.airport-map-kit_&]:after:[background:linear-gradient(to_left,var(--app-floating-edge-shadow),transparent)]",
);

export default function AirportExplorerDesktopSidebar({
  open,
  collapsed = false,
  width,
  sidebarProps,
}) {
  const visibleWidth = collapsed ? "max-content" : width;

  return (
    <div
      className={cn(
        "airport-desktop-sidebar relative isolate shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        mapKitEdgeGlow,
      )}
      data-open={open ? "true" : "false"}
      data-collapsed={collapsed ? "true" : undefined}
      style={{ width: open ? visibleWidth : "0" }}
    >
      <div className="app-panel-transition h-full" style={{ width: visibleWidth }}>
        <AirportSidebar {...sidebarProps} />
      </div>
    </div>
  );
}
