"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface WakeLockState {
  supported: boolean;
  active: boolean;
  error: string | null;
}

/**
 * Browser Screen Wake Lock hook.
 *
 * Calls navigator.wakeLock.request('screen') to prevent the device from
 * sleeping. The lock is automatically released on unmount, and re-acquired
 * when the page becomes visible again (browsers auto-release on tab switch).
 */
export function useWakeLock(): [WakeLockState, () => void] {
  const [supported] = useState(() => {
    try {
      return typeof navigator !== "undefined" && "wakeLock" in navigator;
    } catch {
      return false;
    }
  });
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const wantedRef = useRef(false);

  const releaseLock = useCallback(async () => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    sentinelRef.current = null;
    try {
      await sentinel.release();
    } catch {
      // Ignore release errors.
    }
  }, []);

  const acquireLock = useCallback(async () => {
    if (!supported) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setActive(true);
      setError(null);

      sentinel.addEventListener("release", () => {
        setActive(false);
        sentinelRef.current = null;
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to acquire wake lock");
      setActive(false);
      sentinelRef.current = null;
    }
  }, [supported]);

  const toggle = useCallback(() => {
    wantedRef.current = !wantedRef.current;
    if (wantedRef.current) {
      acquireLock();
    } else {
      releaseLock().then(() => setActive(false));
    }
  }, [acquireLock, releaseLock]);

  // Re-acquire when the page becomes visible again (if user wanted it on).
  useEffect(() => {
    if (!supported) return;

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        wantedRef.current &&
        !sentinelRef.current
      ) {
        acquireLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [supported, acquireLock]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
      }
    };
  }, []);

  return [{ supported, active, error }, toggle];
}
