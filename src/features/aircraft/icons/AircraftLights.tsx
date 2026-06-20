/**
 * Renders exterior aircraft light dots over a silhouette icon.
 *
 * Anchors are looked up by resolved icon family. Lights are positioned in the icon's
 * normalized 0–1 coordinate space and inherit the parent's heading rotation
 * (the icon container already applies `rotate(heading)`).
 */

import { memo } from "react";
import { resolveAircraftIconAnchorRecord } from "./aircraftIconAnchors";
import { resolveActiveLights, type AircraftState } from "../lighting/aircraftLightingModel";

interface AircraftLightsProps {
  /** Resolved icon name (e.g. "a320", "b738"). Must exist in AIRCRAFT_ICON_ANCHORS. */
  iconName: string;
  /** Current aircraft state for phase classification. */
  state: AircraftState;
}

function AircraftLightsInner({ iconName, state }: AircraftLightsProps) {
  const record = resolveAircraftIconAnchorRecord(iconName);
  if (!record?.anchors) return null;

  const activeLights = resolveActiveLights(state, record.anchors, record.family);
  if (activeLights.length === 0) return null;

  return (
    <>
      {activeLights.map((light) => (
        <span
          key={light.def.id}
          className={`aircraft-light ${light.def.animationClass}`}
          style={{
            left: `${light.x * 100}%`,
            top: `${light.y * 100}%`,
            color: "#ffffff",
          }}
        />
      ))}
    </>
  );
}

export const AircraftLights = memo(AircraftLightsInner);
