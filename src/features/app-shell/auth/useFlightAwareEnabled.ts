import { useEffect, useState } from "react";
import { useAuth, useUser } from "@/platform/auth/clerkClient";
import {
  FEATURE_FLAGS,
  getClerkUserPrimaryEmail,
  isFeatureFlagEnabled,
  normalizeFeatureFlags,
} from "../feature-flags/userFeatureFlagsModel";

// Local-dev gate: force the FlightAware path ON in `vite dev` so the feature can
// be exercised without a Clerk login + grant. `import.meta.env.DEV` is false in
// production builds, so this compiles out and the real Clerk-grant gate is the
// only thing that runs in prod (the product guardrail is untouched). Committed
// on purpose — local dev needs zero per-run setup. Flip to `false` to exercise
// the adsbdb path locally.
const DEV_FORCE_FLIGHTAWARE = Boolean(import.meta.env?.DEV);

// Module-scoped dedupe key for the dev log. Every consumer of the hook
// would otherwise re-emit the same line on every render and the
// console gets buried. Keyed on the full signature so a *change* in
// the resolved value still surfaces.
let lastLoggedSignature = "";
const cachedFlagsByEmail = new Map();
const inflightFlagsByEmail = new Map();

async function fetchFlagsForEmail(email, getToken) {
  const token = await getToken?.().catch(() => "");
  const cacheKey = token ? `${email}|auth` : `${email}|anonymous`;
  if (cachedFlagsByEmail.has(cacheKey)) return cachedFlagsByEmail.get(cacheKey);
  if (inflightFlagsByEmail.has(cacheKey)) return inflightFlagsByEmail.get(cacheKey);

  const promise = fetch("/api/feature-flags", {
    cache: "no-store",
    credentials: "same-origin",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => normalizeFeatureFlags(payload?.flags))
    .finally(() => {
      inflightFlagsByEmail.delete(cacheKey);
    });

  inflightFlagsByEmail.set(cacheKey, promise);
  const flags = await promise;
  cachedFlagsByEmail.set(cacheKey, flags);
  return flags;
}

export function useUserFeatureFlags() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
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

    fetchFlagsForEmail(email, getToken)
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
  }, [email, getToken, isLoaded]);

  return {
    email,
    flags: state.flags,
    hasUser,
    resolved: state.resolved,
    user,
  };
}

// Same local-dev gate as DEV_FORCE_FLIGHTAWARE, generalised: every feature flag
// resolves ON in `vite dev` so gated surfaces (Plane Hunter studio, etc.) can be
// exercised without a Clerk login + grant. Compiles out of production builds.
export function useFeatureFlagEnabled(flagKey) {
  const featureFlags = useUserFeatureFlags();
  const enabled =
    DEV_FORCE_FLIGHTAWARE || isFeatureFlagEnabled(featureFlags.flags, flagKey);
  return { ...featureFlags, enabled };
}

export function usePlaneHunterCameraStudioEnabled() {
  const { enabled, resolved } = useFeatureFlagEnabled(
    FEATURE_FLAGS.PLANE_HUNTER_CAMERA_STUDIO,
  );
  return { enabled, resolved };
}

export function useFlightAwareEnabled() {
  const { email, flags, hasUser, user, resolved } = useUserFeatureFlags();
  const granted = isFeatureFlagEnabled(
    flags,
    FEATURE_FLAGS.FLIGHTAWARE_ENABLED,
  );
  const enabled = DEV_FORCE_FLIGHTAWARE || granted;

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

  return { enabled, resolved: DEV_FORCE_FLIGHTAWARE || resolved };
}
