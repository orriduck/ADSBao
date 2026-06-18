import { useEffect, useRef, useState } from "react";

const DEFAULT_SOURCE = "/brand/adsbao-aircraft-brand-loop.mp4";
const VIDEO_LOAD_DELAY_MS = 3500;
const BACKGROUND_HIDDEN_QUERY = "(max-width: 720px)";

export default function BrandingVideoBackground({ source = DEFAULT_SOURCE }) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const backgroundHidden = window.matchMedia(BACKGROUND_HIDDEN_QUERY).matches;
    if (reduceMotion || backgroundHidden) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      setVisible(false);
      return undefined;
    }

    let cancelled = false;
    let idleId = 0;
    let loadTimer = 0;
    const show = () => setVisible(true);
    const play = () => {
      if (cancelled) return;
      video.src = source;
      video.load();
      video.muted = true;
      video.play()?.catch?.(() => {});
    };
    const schedulePlay = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(play, { timeout: 1500 });
        return;
      }
      play();
    };

    setVisible(false);
    video.removeAttribute("src");
    video.load();
    video.addEventListener("loadeddata", show);
    // Decorative media should not compete with the interactive first screen.
    loadTimer = window.setTimeout(schedulePlay, VIDEO_LOAD_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      if (idleId) window.cancelIdleCallback?.(idleId);
      video.removeEventListener("loadeddata", show);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [source]);

  return (
    <div className="branding-video-background" aria-hidden="true">
      <video
        ref={videoRef}
        className={`branding-video-background__media ${visible ? "is-visible" : ""}`.trim()}
        muted
        playsInline
        loop
        preload="none"
      />
    </div>
  );
}
