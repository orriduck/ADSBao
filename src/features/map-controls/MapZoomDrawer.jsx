"use client";

import { Button } from "../../components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

export default function MapZoomDrawer({
  id,
  open,
  options,
  activeZoom,
  onSelect,
}) {
  return (
    <div
      id={id}
      className={`map-action-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      {options.map(({ value, title, iconKey }) => (
        <Button
          key={value}
          variant="atcIcon"
          size="icon"
          className={`ctrl-btn drawer-btn ${activeZoom === value ? "active" : ""}`}
          title={title}
          onClick={() => onSelect(value)}
          type="button"
        >
          <MapControlIcon iconKey={iconKey} />
        </Button>
      ))}
    </div>
  );
}
