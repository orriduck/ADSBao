/**
 * Renders exterior aircraft light dots over a silhouette icon.
 *
 * Anchors are looked up from the pre-generated AIRCRAFT_ICON_ANCHORS map
 * using the resolved icon name. Lights are positioned in the icon's
 * normalized 0–1 coordinate space and inherit the parent's heading rotation
 * (the icon container already applies `rotate(heading)`).
 */

import { memo } from "react";
import { AIRCRAFT_ICON_ANCHORS, type AircraftIconAnchorRecord } from "./aircraftIconAnchors.generated";
import { resolveActiveLights, type AircraftState } from "../lighting/aircraftLightingModel";

interface AircraftLightsProps {
  /** Resolved icon name (e.g. "a320", "b738"). Must exist in AIRCRAFT_ICON_ANCHORS. */
  iconName: string;
  /** Current aircraft state for phase classification. */
  state: AircraftState;
}

function AircraftLightsInner({ iconName, state }: AircraftLightsProps) {
  const record: AircraftIconAnchorRecord | undefined = (AIRCRAFT_ICON_ANCHORS as any)[iconName];
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
            color: light.def.color === "red"
              ? "#ff2020"
              : light.def.color === "green"
                ? "#00e040"
                : "#ffffff",
          }}
        />
      ))}
    </>
  );
}

export const AircraftLights = memo(AircraftLightsInner);
