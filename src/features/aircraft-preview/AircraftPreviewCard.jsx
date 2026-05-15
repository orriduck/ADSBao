"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AircraftPreviewIcon from "./AircraftPreviewIcon.jsx";
import AircraftPreviewType from "./AircraftPreviewType.jsx";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity.jsx";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry.jsx";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata.jsx";
import { getAircraftIdentity } from "../airport-context/airportContextUiModel.js";

// Card-from-pocket easing: snappy start, smooth landing. Ease-end only,
// no ease-in — the body should look like it's being pulled, not nudged.
const POCKET_EASE = [0.16, 1, 0.3, 1];

const CARD_MOTION = {
  initial: { opacity: 0, y: 96 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 96 },
  transition: { duration: 0.46, ease: POCKET_EASE },
};

// Icon slides on the same vertical axis as the card but with a small
// delay and a longer duration, so it visibly trails behind on entry and
// lingers a beat longer on exit — the parallax-trailing-from-the-pocket
// feel. Both animations use the same ease-out curve.
const ICON_MOTION = {
  initial: { y: 96, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 96, opacity: 0 },
  transition: { duration: 0.62, ease: POCKET_EASE, delay: 0.1 },
};

export default function AircraftPreviewCard({ aircraft = null }) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {aircraft && (
        <motion.aside
          key={getAircraftIdentity(aircraft) || "preview-card"}
          className="aircraft-preview-card"
          aria-label="Aircraft preview"
          {...(reducedMotion
            ? {
                initial: false,
                animate: { opacity: 1 },
                exit: { opacity: 0 },
              }
            : CARD_MOTION)}
        >
          <header className="aircraft-preview-card__header">
            <motion.div
              className="aircraft-preview-card__icon-layer"
              {...(reducedMotion
                ? { initial: false, animate: { opacity: 1 } }
                : ICON_MOTION)}
            >
              <AircraftPreviewIcon aircraft={aircraft} />
            </motion.div>
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
