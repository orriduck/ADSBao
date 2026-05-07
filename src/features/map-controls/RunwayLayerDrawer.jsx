"use client";

import { Button } from "../../components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const BEAM_ICON_KEY = "planeLanding";
const BADGE_ICON_KEY = "towerControl";

export default function RunwayLayerDrawer({
  id,
  open,
  showBeams,
  showBadges,
  onToggleBeams,
  onToggleBadges,
}) {
  return (
    <div
      id={id}
      className={`map-action-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn drawer-btn ${showBeams ? "active" : ""}`}
        aria-pressed={showBeams}
        title={showBeams ? "Hide approach beams" : "Show approach beams"}
        onClick={onToggleBeams}
        type="button"
      >
        <MapControlIcon iconKey={BEAM_ICON_KEY} />
      </Button>
      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn drawer-btn ${showBadges ? "active" : ""}`}
        aria-pressed={showBadges}
        title={showBadges ? "Hide runway badges" : "Show runway badges"}
        onClick={onToggleBadges}
        type="button"
      >
        <MapControlIcon iconKey={BADGE_ICON_KEY} />
      </Button>
    </div>
  );
}
