"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_FOCUS_VIDEO_DEFAULT } from "../../../config/mapControls.js";

export function useFocusAudio(videoId = MAP_FOCUS_VIDEO_DEFAULT) {
  const playerHost = useRef(null);
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const currentVideoIdRef = useRef(videoId);

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
        videoId: currentVideoIdRef.current,
        playerVars: {
          autoplay: 0,
          loop: 1,
          playlist: currentVideoIdRef.current,
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

  // Swap to a new video without tearing down the player. Calling
  // loadVideoById preserves the iframe + listeners, keeps the
  // playing/paused state visible to the UI, and starts the new track
  // immediately if the user was already in focus mode (which is the
  // right UX — selecting a new accent means selecting its track).
  useEffect(() => {
    if (videoId === currentVideoIdRef.current) return;
    currentVideoIdRef.current = videoId;
    if (!audioReady || !player.current) return;
    const wasPlaying = playing;
    // cueVideoById buffers without auto-play; loadVideoById plays
    // immediately. Match the previous play state so a paused user
    // doesn't suddenly hear audio after a primary-color switch.
    if (wasPlaying) {
      player.current.loadVideoById({ videoId, suggestedQuality: "small" });
    } else {
      player.current.cueVideoById({ videoId, suggestedQuality: "small" });
    }
  }, [videoId, audioReady, playing]);

  const toggleAudio = () => {
    if (!player.current || !audioReady) return;
    if (playing) player.current.pauseVideo();
    else player.current.playVideo();
  };

  return { playerHost, playing, audioReady, toggleAudio };
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
