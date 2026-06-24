import { useEffect, useRef, useState } from "react";

const DEFAULT_SOURCE = "/brand/adsbao-aircraft-brand-loop-20260619.mp4";
const DEFAULT_POSTER = "/brand/adsbao-aircraft-brand-poster.jpg";

export default function BrandingVideoBackground({
  source = DEFAULT_SOURCE,
  poster = DEFAULT_POSTER,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let frame = 0;

    const updateShouldLoad = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const style = window.getComputedStyle(container);
        setShouldLoad(
          !reduceMotionQuery.matches &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0,
        );
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateShouldLoad);
    resizeObserver?.observe(container);
    window.addEventListener("resize", updateShouldLoad);
    reduceMotionQuery.addEventListener("change", updateShouldLoad);
    updateShouldLoad();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateShouldLoad);
      reduceMotionQuery.removeEventListener("change", updateShouldLoad);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (!shouldLoad) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      setVisible(false);
      return undefined;
    }

    let animationFrame = 0;
    let cancelled = false;

    const showWhenReady = () => {
      if (cancelled) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setVisible(true);
        return;
      }
      animationFrame = window.requestAnimationFrame(showWhenReady);
    };
    const videoEvents = ["loadeddata", "canplay", "playing"];

    setVisible(false);
    video.removeAttribute("src");
    video.load();
    for (const eventName of videoEvents) {
      video.addEventListener(eventName, showWhenReady);
    }
    video.src = source;
    video.load();
    video.muted = true;
    video.play()?.catch?.(() => {});
    showWhenReady();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      for (const eventName of videoEvents) {
        video.removeEventListener(eventName, showWhenReady);
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [shouldLoad, source]);

  return (
    <div
      ref={containerRef}
      className="branding-video-background"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className={`branding-video-background__media ${visible ? "is-visible" : ""}`.trim()}
        muted
        playsInline
        loop
        poster={poster}
        preload="auto"
      />
    </div>
  );
}
