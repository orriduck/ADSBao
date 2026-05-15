"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AircraftPreviewIcon from "./AircraftPreviewIcon.jsx";
import AircraftPreviewType from "./AircraftPreviewType.jsx";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity.jsx";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry.jsx";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata.jsx";
import { getAircraftIdentity } from "../airport-context/airportContextUiModel.js";

// Bottom-right preview card for the currently-focused aircraft. Composes
// the small per-section components — each consumes the aircraft prop
// directly so adding / reordering sections doesn't require threading
// state. Mounts whenever an aircraft is focused (clicked); animates out
// when focus clears.
export default function AircraftPreviewCard({ aircraft = null }) {
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 24 },
        transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] },
      };

  return (
    <AnimatePresence>
      {aircraft && (
        <motion.aside
          key={getAircraftIdentity(aircraft) || "preview-card"}
          className="aircraft-preview-card"
          aria-label="Aircraft preview"
          {...motionProps}
        >
          <header className="aircraft-preview-card__header">
            <AircraftPreviewIcon aircraft={aircraft} />
            <AircraftPreviewType aircraft={aircraft} />
          </header>
          <div className="aircraft-preview-card__divider" />
          <AircraftPreviewIdentity aircraft={aircraft} />
          <AircraftPreviewTelemetry aircraft={aircraft} />
          <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
          <AircraftPreviewMetadata aircraft={aircraft} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
