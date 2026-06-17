"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_SOURCE = "/brand/adsbao-aircraft-brand-loop.mp4";

export default function BrandingVideoBackground({ source = DEFAULT_SOURCE }) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      video.pause();
      setVisible(false);
      return undefined;
    }

    const show = () => setVisible(true);
    const play = () => {
      video.muted = true;
      video.play()?.catch?.(() => {});
    };
    video.addEventListener("loadeddata", show);
    play();

    return () => {
      video.removeEventListener("loadeddata", show);
      video.pause();
    };
  }, [source]);

  return (
    <div className="branding-video-background" aria-hidden="true">
      <video
        ref={videoRef}
        className={`branding-video-background__media ${visible ? "is-visible" : ""}`.trim()}
        src={source}
        muted
        playsInline
        loop
        preload="metadata"
      />
    </div>
  );
}
