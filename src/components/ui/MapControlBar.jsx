"use client";

import {
  AudioLines,
  Crosshair,
  Gauge,
  Monitor,
  Moon,
  PlaneLanding,
  SlidersHorizontal,
  Sun,
  TowerControl,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../utils/airportMapDisplay.js";
import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
  applyThemePreference,
  initThemePreference,
  nextTheme,
  writeStoredTheme,
} from "../../utils/theme.js";
import { Button } from "./button.jsx";

const VIDEO_ID = "JDQiaRYmTGk";

const zoomOptions = [
  { value: ZOOM_APPROACH, title: "Approaching view", Icon: PlaneLanding },
  { value: ZOOM_AIRPORT, title: "Airport view", Icon: TowerControl },
  { value: ZOOM_DETAIL, title: "Detail view", Icon: Crosshair },
];

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  showMapLabels = true,
  showTelemetry = true,
  onZoom,
  onToggleMapLabels,
  onToggleTelemetry,
}) {
  const controlZone = useRef(null);
  const playerHost = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEME_SYSTEM);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const player = useRef(null);
  const mediaQueryList = useRef(null);

  const currentZoomOption = useMemo(
    () => zoomOptions.find((option) => option.value === activeZoom) || zoomOptions[1],
    [activeZoom],
  );

  const themeTitle = useMemo(() => {
    if (currentTheme === THEME_LIGHT) return "Theme: Light (click to switch)";
    if (currentTheme === THEME_DARK) return "Theme: Dark (click to switch)";
    return "Theme: System (click to switch)";
  }, [currentTheme]);

  useEffect(() => {
    const closeDrawer = () => setDrawerOpen(false);
    const handlePointerDown = (event) => {
      if (!drawerOpen || controlZone.current?.contains(event.target)) return;
      closeDrawer();
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    mediaQueryList.current = window.matchMedia("(prefers-color-scheme: dark)");
    setCurrentTheme(
      initThemePreference({ mediaQueryList: mediaQueryList.current }).preference,
    );
    const listener = () => {
      if (currentTheme === THEME_SYSTEM) {
        applyThemePreference({
          theme: THEME_SYSTEM,
          mediaQueryList: mediaQueryList.current,
        });
      }
    };
    mediaQueryList.current.addEventListener("change", listener);
    return () => mediaQueryList.current?.removeEventListener("change", listener);
  }, [currentTheme]);

  useEffect(() => {
    const playerHostEl = playerHost.current;
    if (!playerHostEl) return undefined;

    let cancelled = false;
    let playerTarget = null;

    loadYouTubeApi().then(() => {
      if (cancelled) return;

      playerTarget = document.createElement("div");
      playerHostEl.replaceChildren(playerTarget);

      player.current = new window.YT.Player(playerTarget, {
        height: 1,
        width: 1,
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          loop: 1,
          playlist: VIDEO_ID,
          controls: 0,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady() {
            setAudioReady(true);
          },
          onStateChange(e) {
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      playerTarget?.remove();
      playerHostEl.replaceChildren();
    };
  }, []);

  const cycleTheme = () => {
    const next = nextTheme(currentTheme);
    setCurrentTheme(next);
    writeStoredTheme(next);
    applyThemePreference({ theme: next, mediaQueryList: mediaQueryList.current });
  };

  const selectZoom = (zoom) => {
    onZoom?.(zoom);
    setDrawerOpen(false);
  };

  const cycleZoom = () => {
    const currentIndex = zoomOptions.findIndex((option) => option.value === activeZoom);
    const nextIndex = (currentIndex + 1) % zoomOptions.length;
    onZoom?.(zoomOptions[nextIndex].value);
  };

  const toggleAudio = () => {
    if (!player.current || !audioReady) return;
    if (playing) player.current.pauseVideo();
    else player.current.playVideo();
  };

  const CurrentIcon = currentZoomOption.Icon;
  const ThemeIcon =
    currentTheme === THEME_LIGHT
      ? Sun
      : currentTheme === THEME_DARK
        ? Moon
        : Monitor;

  return (
    <>
      <div ref={playerHost} className="yt-sink" aria-hidden="true" />
      <div ref={controlZone} className="map-ctrl-zone">
        <div
          id="map-action-drawer"
          className={`map-action-drawer ${drawerOpen ? "open" : ""}`}
          aria-hidden={!drawerOpen}
        >
          {zoomOptions.map(({ value, title, Icon }) => (
            <Button
              key={value}
              variant="atcIcon"
              size="icon"
              className={`ctrl-btn drawer-btn ${activeZoom === value ? "active" : ""}`}
              title={title}
              onClick={() => selectZoom(value)}
              type="button"
            >
              <Icon />
            </Button>
          ))}
        </div>

        <div className="map-ctrl-bar">
          <Button
            variant="atcIcon"
            size="icon"
            className="ctrl-btn ctrl-view active"
            title={`${currentZoomOption.title} (click to cycle)`}
            onClick={cycleZoom}
            type="button"
          >
            <CurrentIcon />
          </Button>

          <div className="ctrl-sep" />

          <Button
            variant="atcIcon"
            size="icon"
            className={`ctrl-btn ctrl-audio ${playing ? "playing" : ""} ${
              !audioReady ? "loading" : ""
            }`}
            aria-pressed={playing}
            title={playing ? "Pause Focus mode" : "Start Focus mode"}
            onClick={toggleAudio}
            type="button"
          >
            <AudioLines />
          </Button>

          <Button
            variant="atcIcon"
            size="icon"
            className="ctrl-btn ctrl-theme"
            title={themeTitle}
            onClick={cycleTheme}
            type="button"
          >
            <ThemeIcon />
          </Button>

          <Button
            variant="atcIcon"
            size="icon"
            className={`ctrl-btn ${showMapLabels ? "active" : ""}`}
            aria-pressed={showMapLabels}
            title={showMapLabels ? "Hide map labels" : "Show map labels"}
            onClick={onToggleMapLabels}
            type="button"
          >
            <Type />
          </Button>

          <Button
            variant="atcIcon"
            size="icon"
            className={`ctrl-btn ${showTelemetry ? "active" : ""}`}
            aria-pressed={showTelemetry}
            title={showTelemetry ? "Hide speed/altitude" : "Show speed/altitude"}
            onClick={onToggleTelemetry}
            type="button"
          >
            <Gauge />
          </Button>

          <Button
            variant="atcIcon"
            size="icon"
            className={`ctrl-btn ctrl-more ${drawerOpen ? "active" : ""}`}
            aria-expanded={drawerOpen}
            aria-controls="map-action-drawer"
            title="Map controls"
            onClick={() => setDrawerOpen((value) => !value)}
            type="button"
          >
            <SlidersHorizontal />
          </Button>
        </div>
      </div>
    </>
  );
}

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}
