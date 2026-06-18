import AirportSidebar from "@/components/sidebar/AirportSidebar";

export default function AirportExplorerDesktopSidebar({
  open,
  collapsed = false,
  width,
  sidebarProps,
}) {
  const visibleWidth = collapsed ? "max-content" : width;

  return (
    <div
      className="airport-desktop-sidebar shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
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
