import { useEffect, useRef, useState } from "react";

const DEFAULT_SOURCE = "/brand/adsbao-aircraft-brand-loop.mp4";
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
  }, [source]);

  return (
    <div className="branding-video-background" aria-hidden="true">
      <video
        ref={videoRef}
        className={`branding-video-background__media ${visible ? "is-visible" : ""}`.trim()}
        muted
        playsInline
        loop
        preload="auto"
      />
    </div>
  );
}
