"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAircraftProximityAudioCue } from "@/features/airport/map/userLocationAudioModel";

type UserLocationAircraftAudioRecord = Record<string, any>;

type BrowserAudioContext = AudioContext & {
  webkitAudioContext?: typeof AudioContext;
};

const getAudioContextConstructor = () => {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
};

export function useUserLocationAircraftAudio({
  enabled = false,
  userLocation = null,
  aircraft = [],
}: {
  enabled?: boolean;
  userLocation?: UserLocationAircraftAudioRecord | null;
  aircraft?: UserLocationAircraftAudioRecord[];
}) {
  const audioContextRef = useRef<BrowserAudioContext | null>(null);
  const [pulseBeat, setPulseBeat] = useState(0);
  const cue = useMemo(
    () => buildAircraftProximityAudioCue({ userLocation, aircraft }),
    [aircraft, userLocation],
  );
  const cueAircraftId = cue?.aircraftId || "";
  const cueIntervalMs = cue?.intervalMs || null;
  const cueToneHz = cue?.toneHz || null;

  const unlockAudio = useCallback(() => {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return false;

    if (!audioContextRef.current) {
      audioContextRef.current =
        new AudioContextConstructor() as BrowserAudioContext;
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return true;
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPulseBeat(0);
      if (audioContextRef.current?.state === "running") {
        void audioContextRef.current.suspend();
      }
      return undefined;
    }

    if (!cueAircraftId || !cueIntervalMs || !cueToneHz) return undefined;
    unlockAudio();

    const playCue = () => {
      setPulseBeat((value) => value + 1);
      const context = audioContextRef.current;
      if (!context || context.state !== "running") return;

      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(cueToneHz, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.1);
    };

    playCue();
    const interval = window.setInterval(playCue, cueIntervalMs);
    return () => window.clearInterval(interval);
  }, [cueAircraftId, cueIntervalMs, cueToneHz, enabled, unlockAudio]);

  useEffect(
    () => () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    },
    [],
  );

  return {
    cue,
    pulseBeat,
    unlockAudio,
  };
}
