import { useCallback, useEffect, useRef, useState } from "react";

export interface WakeLockState {
  supported: boolean;
  active: boolean;
  pending: boolean;
  error: string | null;
}

type WakeLockAction = () => void;

/**
 * Browser Screen Wake Lock hook.
 *
 * Calls navigator.wakeLock.request('screen') to prevent the device from
 * sleeping. The lock is automatically released on unmount, and re-acquired
 * when the page becomes visible again (browsers auto-release on tab switch).
 */
export function useWakeLock(): [WakeLockState, WakeLockAction, WakeLockAction] {
  // Always start with supported=false so SSR and the first client render
  // match exactly. Actual support is detected in useEffect on the client.
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const requestPendingRef = useRef(false);
  const mountedRef = useRef(true);
  // Tracking is an eyes-on activity. Start wanted in every map mode; the user
  // can still turn it off from the map settings at any time.
  const wantedRef = useRef(true);

  // Detect actual Wake Lock support on the client after hydration.
  // Using useEffect keeps the first render (both SSR and client)
  // identical, avoiding hydration mismatches.
  useEffect(() => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        setSupported(true);
      }
    } catch {
      // navigator not available — leave supported as false.
    }
  }, []);

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
    if (
      !supported ||
      !wantedRef.current ||
      sentinelRef.current ||
      requestPendingRef.current ||
      document.visibilityState !== "visible"
    ) {
      return;
    }
    requestPendingRef.current = true;
    setPending(true);
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      if (!mountedRef.current || !wantedRef.current) {
        await sentinel.release().catch(() => {});
        return;
      }
      sentinelRef.current = sentinel;
      setActive(true);
      setError(null);

      sentinel.addEventListener("release", () => {
        if (!mountedRef.current) return;
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setActive(false);
        }
      });
    } catch (err: unknown) {
      if (mountedRef.current && wantedRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to acquire wake lock",
        );
        setActive(false);
        sentinelRef.current = null;
      }
    } finally {
      requestPendingRef.current = false;
      if (mountedRef.current) setPending(false);
    }
  }, [supported]);

  const request = useCallback(() => {
    wantedRef.current = true;
    setError(null);
    void acquireLock();
  }, [acquireLock]);

  const toggle = useCallback(() => {
    if (sentinelRef.current || active || requestPendingRef.current) {
      wantedRef.current = false;
      void releaseLock().then(() => {
        if (mountedRef.current) setActive(false);
      });
      return;
    }
    request();
  }, [active, releaseLock, request]);

  // Acquire as soon as browser support is known. The previous implementation
  // only acquired after a manual toggle, leaving every map mode sleep-prone by
  // default even though the control represented a persistent user intent.
  useEffect(() => {
    if (supported && wantedRef.current && !sentinelRef.current) {
      request();
    }
  }, [supported, request]);

  // Re-acquire when the page becomes visible again (if user wanted it on).
  useEffect(() => {
    if (!supported) return;

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        wantedRef.current &&
        !sentinelRef.current
      ) {
        request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [supported, request]);

  // Cleanup on unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
      }
    };
  }, []);

  return [{ supported, active, pending, error }, toggle, request];
}
