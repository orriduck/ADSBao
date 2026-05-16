"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_FOCUS_VIDEO_ID } from "../../../config/mapControls.js";

export function useFocusAudio() {
  const playerHost = useRef(null);
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

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
        videoId: MAP_FOCUS_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          loop: 1,
          playlist: MAP_FOCUS_VIDEO_ID,
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
