"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_SOURCE = "/brand/adsbao-aircraft-brand-loop.mp4";
const CROSSFADE_SECONDS = 1.8;

export default function BrandingVideoBackground({ source = DEFAULT_SOURCE }) {
  const primaryVideoRef = useRef(null);
  const secondaryVideoRef = useRef(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const crossingRef = useRef(false);
  const visibleIndexRef = useRef(0);

  useEffect(() => {
    visibleIndexRef.current = visibleIndex;
  }, [visibleIndex]);

  useEffect(() => {
    const videos = [primaryVideoRef.current, secondaryVideoRef.current];
    if (videos.some((video) => !video)) return undefined;

    let frameId = null;
    let fadeTimer = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const playVideo = (video) => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    };

    const resetVideo = (video) => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // Browsers can reject seeks before metadata is available.
      }
    };

    const startCrossfade = () => {
      if (crossingRef.current) return;
      crossingRef.current = true;

      const currentIndex = visibleIndexRef.current;
      const nextIndex = currentIndex === 0 ? 1 : 0;
      const current = videos[currentIndex];
      const next = videos[nextIndex];

      next.currentTime = 0;
      playVideo(next);
      setVisibleIndex(nextIndex);

      fadeTimer = window.setTimeout(() => {
        resetVideo(current);
        crossingRef.current = false;
      }, CROSSFADE_SECONDS * 1000);
    };

    const tick = () => {
      const current = videos[visibleIndexRef.current];
      if (current?.duration && current.duration - current.currentTime <= CROSSFADE_SECONDS) {
        startCrossfade();
      }
      frameId = window.requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      resetVideo(videos[0]);
      resetVideo(videos[1]);
      setVisibleIndex(0);
      return () => {
        videos.forEach((video) => video.pause());
      };
    }

    resetVideo(videos[1]);
    playVideo(videos[0]);
    frameId = window.requestAnimationFrame(tick);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (fadeTimer !== null) window.clearTimeout(fadeTimer);
      videos.forEach((video) => video.pause());
    };
  }, [source]);

  return (
    <div className="branding-video-background" aria-hidden="true">
      {[0, 1].map((index) => (
        <video
          key={`${source}-${index}`}
          ref={index === 0 ? primaryVideoRef : secondaryVideoRef}
          className={`branding-video-background__media ${
            visibleIndex === index ? "is-visible" : ""
          }`.trim()}
          src={source}
          muted
          playsInline
          preload="auto"
        />
      ))}
    </div>
  );
}
