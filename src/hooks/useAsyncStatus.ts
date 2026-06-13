"use client";

import { useEffect, useRef, useState } from "react";

type AsyncPhase = "idle" | "pending" | "success" | "error" | "fading";

export interface AsyncStatusInput {
  loading: boolean;
  error?: unknown;
  statusCode?: number | null;
  // Bump when a new operation starts so a fresh pending overrides a fading success.
  cycleKey?: string | number | null;
}

export interface AsyncStatusState {
  phase: AsyncPhase;
  statusCode: number | null;
  hasError: boolean;
}

const DEFAULT_LINGER_MS = 1400;
const DEFAULT_FADE_MS = 360;

// Derives a single phase from a loading flag + result. After the request settles
// the phase lingers as success/error for `lingerMs`, transitions to "fading" for
// `fadeMs`, then back to "idle" so the slot collapses cleanly.
export function useAsyncStatus(
  input: AsyncStatusInput,
  options: { lingerMs?: number; fadeMs?: number } = {},
): AsyncStatusState {
  const lingerMs = options.lingerMs ?? DEFAULT_LINGER_MS;
  const fadeMs = options.fadeMs ?? DEFAULT_FADE_MS;

  const [phase, setPhase] = useState<AsyncPhase>(() =>
    input.loading ? "pending" : "idle",
  );
  const [resolvedStatus, setResolvedStatus] = useState<number | null>(
    input.statusCode ?? null,
  );
  const [hasError, setHasError] = useState<boolean>(Boolean(input.error));
  const wasLoadingRef = useRef<boolean>(input.loading);
  const cycleRef = useRef<string | number | null | undefined>(input.cycleKey);

  useEffect(() => {
    let lingerTimer: number | null = null;
    let fadeTimer: number | null = null;

    if (input.loading) {
      setPhase("pending");
      setHasError(false);
      setResolvedStatus(null);
      wasLoadingRef.current = true;
      cycleRef.current = input.cycleKey;
      return () => {
        if (lingerTimer != null) window.clearTimeout(lingerTimer);
        if (fadeTimer != null) window.clearTimeout(fadeTimer);
      };
    }

    // Only emit success/error if we were just pending. Otherwise stay where we
    // are — random parent re-renders shouldn't restart a fade.
    const cycleChanged = cycleRef.current !== input.cycleKey;
    if (wasLoadingRef.current || cycleChanged) {
      const errored = Boolean(input.error);
      setHasError(errored);
      setResolvedStatus(input.statusCode ?? (errored ? null : 200));
      setPhase(errored ? "error" : "success");
      wasLoadingRef.current = false;
      cycleRef.current = input.cycleKey;

      lingerTimer = window.setTimeout(() => {
        setPhase("fading");
        fadeTimer = window.setTimeout(() => {
          setPhase("idle");
        }, fadeMs);
      }, lingerMs);
    }

    return () => {
      if (lingerTimer != null) window.clearTimeout(lingerTimer);
      if (fadeTimer != null) window.clearTimeout(fadeTimer);
    };
  }, [input.loading, input.error, input.statusCode, input.cycleKey, lingerMs, fadeMs]);

  return { phase, statusCode: resolvedStatus, hasError };
}
