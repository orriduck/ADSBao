"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AircraftPreviewMediaCard from "./AircraftPreviewMediaCard.jsx";
import AircraftPreviewMetadataCard from "./AircraftPreviewMetadataCard.jsx";
import AircraftPreviewMobileCard from "./AircraftPreviewMobileCard.jsx";
import { useAircraftPhoto } from "./useAircraftPhoto.js";
import { getAircraftIdentity } from "../airport-context/airportContextUiModel.js";

const POCKET_EASE = [0.16, 1, 0.3, 1];

const STACK_MOTION = {
  initial: { opacity: 0, y: 96 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 96 },
  transition: { duration: 0.46, ease: POCKET_EASE },
};

const MEDIA_MOTION = {
  initial: { opacity: 0, y: 96 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 56 },
  transition: { duration: 0.52, ease: POCKET_EASE },
};

const PHOTO_TONE_DARK = "dark";
const PHOTO_TONE_LIGHT = "light";

export default function AircraftPreviewCard({ aircraft = null, isMobile = false, sidebarOpen = false }) {
  const reducedMotion = useReducedMotion();
  const photoState = useAircraftPhoto(aircraft);
  const photo = photoState.photo;
  const hasPhoto = Boolean(photo?.src);
  const photoTone = usePhotoTone(photo?.src);

  const identityKey = (aircraft && getAircraftIdentity(aircraft)) || "preview-card";
  const showMobile = isMobile && !sidebarOpen;

  return (
    <AnimatePresence>
      {aircraft && !isMobile && (
        <motion.aside
          key={identityKey}
          className={`aircraft-preview-card ${
            hasPhoto ? "aircraft-preview-card--has-photo" : ""
          } aircraft-preview-card--photo-${photoTone}`}
          aria-label="Aircraft preview"
          {...(reducedMotion
            ? {
                initial: false,
                animate: { opacity: 1 },
                exit: { opacity: 0 },
              }
            : STACK_MOTION)}
        >
          <AnimatePresence>
            {hasPhoto && (
              <motion.div
                className="aircraft-preview-card__media-slot"
                key={`photo-${photo.src}`}
                {...(reducedMotion
                  ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
                  : MEDIA_MOTION)}
              >
                <AircraftPreviewMediaCard photo={photo} />
              </motion.div>
            )}
          </AnimatePresence>
          <AircraftPreviewMetadataCard aircraft={aircraft} photo={photo} />
        </motion.aside>
      )}
      {aircraft && showMobile && (
        <motion.aside
          key={`mobile-${identityKey}`}
          className="aircraft-preview-mobile-card"
          aria-label="Aircraft preview"
          {...(reducedMotion
            ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
            : STACK_MOTION)}
        >
          <AircraftPreviewMobileCard aircraft={aircraft} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function usePhotoTone(src) {
  const [tone, setTone] = useState(PHOTO_TONE_DARK);

  useEffect(() => {
    if (!src) {
      setTone(PHOTO_TONE_DARK);
      return undefined;
    }

    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const width = 24;
      const height = 16;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      let luma = 0;
      for (let index = 0; index < data.length; index += 4) {
        luma +=
          data[index] * 0.2126 +
          data[index + 1] * 0.7152 +
          data[index + 2] * 0.0722;
      }
      setTone(
        luma / (data.length / 4) > 150
          ? PHOTO_TONE_LIGHT
          : PHOTO_TONE_DARK,
      );
    };
    image.onerror = () => {
      if (!cancelled) setTone(PHOTO_TONE_DARK);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return tone;
}
