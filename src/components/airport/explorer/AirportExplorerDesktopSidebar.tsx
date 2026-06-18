import AirportSidebar from "@/components/sidebar/AirportSidebar";

export default function AirportExplorerDesktopSidebar({
  open,
  width,
  sidebarProps,
}) {
  return (
    <div
      className="airport-desktop-sidebar shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      data-open={open ? "true" : "false"}
      style={{ width: open ? width : "0" }}
    >
      <div className="app-panel-transition h-full" style={{ width }}>
        <AirportSidebar {...sidebarProps} />
      </div>
    </div>
  );
}
