"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  FEATURE_FLAGS,
  getClerkUserPrimaryEmail,
  isFeatureFlagEnabled,
  isImmersiveModeEnabled,
  isPreviewImmersiveModeOverrideEnabled,
  normalizeFeatureFlags,
} from "../feature-flags/userFeatureFlagsModel";

// Module-scoped dedupe key for the dev log. Every consumer of the hook
// would otherwise re-emit the same line on every render and the
// console gets buried. Keyed on the full signature so a *change* in
// the resolved value still surfaces.
let lastLoggedSignature = "";
const cachedFlagsByEmail = new Map();
const inflightFlagsByEmail = new Map();

async function fetchFlagsForEmail(email) {
  if (cachedFlagsByEmail.has(email)) return cachedFlagsByEmail.get(email);
  if (inflightFlagsByEmail.has(email)) return inflightFlagsByEmail.get(email);

  const promise = fetch("/api/feature-flags", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => normalizeFeatureFlags(payload?.flags))
    .finally(() => {
      inflightFlagsByEmail.delete(email);
    });

  inflightFlagsByEmail.set(email, promise);
  const flags = await promise;
  cachedFlagsByEmail.set(email, flags);
  return flags;
}

export function useUserFeatureFlags() {
  const { isLoaded, isSignedIn, user } = useUser();
  const hasUser = Boolean(isLoaded && isSignedIn && user);
  const email = hasUser ? getClerkUserPrimaryEmail(user) : "";
  const [state, setState] = useState({ flags: {}, resolved: false });

  useEffect(() => {
    let cancelled = false;
    setState({ flags: {}, resolved: Boolean(isLoaded && !email) });
    if (!email) {
      return () => {
        cancelled = true;
      };
    }

    fetchFlagsForEmail(email)
      .then((nextFlags) => {
        if (!cancelled) setState({ flags: nextFlags, resolved: true });
      })
      .catch((error) => {
        if (!cancelled) setState({ flags: {}, resolved: true });
        if (process.env.NODE_ENV !== "production") {
          console.warn("[flightaware-enabled] feature flag fetch failed", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email, isLoaded]);

  return {
    email,
    flags: state.flags,
    hasUser,
    resolved: state.resolved,
    user,
  };
}

export function useFlightAwareEnabled() {
  const { email, flags, hasUser, user } = useUserFeatureFlags();
  const enabled = isFeatureFlagEnabled(
    flags,
    FEATURE_FLAGS.FLIGHTAWARE_ENABLED,
  );

  // Dev-only trace, deduped across the whole app: each consumer of the
  // hook re-renders independently, and several of them re-run on every
  // poll, so emitting unconditionally floods the console. Only log when
  // the resolved signature changes — the first true → true repeat is
  // suppressed, but a flip back to undefined / a different user shows
  // up immediately.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !hasUser) return;
    const raw = flags[FEATURE_FLAGS.FLIGHTAWARE_ENABLED];
    const signature = `${user.id}|${email}|${JSON.stringify(raw)}|${typeof raw}|${enabled}`;
    if (signature !== lastLoggedSignature) {
      lastLoggedSignature = signature;
      console.info(
        `[flightaware-enabled] clerkUser=${user.id} primaryEmail=${email || "(none)"} flightAwareEnabled.raw=${JSON.stringify(raw)} typeof=${typeof raw} -> ${enabled}`,
      );
    }
  }, [email, enabled, flags, hasUser, user]);

  return enabled;
}

export function useImmersiveModeFeature() {
  const { flags, resolved } = useUserFeatureFlags();
  const previewOverrideEnabled =
    typeof window !== "undefined" &&
    isPreviewImmersiveModeOverrideEnabled(window.location);

  return {
    enabled: isImmersiveModeEnabled(flags) || previewOverrideEnabled,
    resolved: resolved || previewOverrideEnabled,
  };
}
