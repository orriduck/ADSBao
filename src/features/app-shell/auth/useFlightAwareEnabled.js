"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { buildClerkUserAccessEntity, isFlightAwareOwnerEntity } from "./clerkRouteProviderAccess.js";

// Module-scoped dedupe key for the dev log. Every consumer of the hook
// would otherwise re-emit the same line on every render and the
// console gets buried. Keyed on the full signature so a *change* in
// the resolved value still surfaces.
let lastLoggedSignature = "";

// Client-side mirror of isFlightAwareOwnerEntity. Resolves to true only
// when Clerk has finished loading, a user is signed in, and their
// publicMetadata sets { flightAwareEnabled: true }. Anyone else (signed
// out, loading, or without the flag) gets false.
//
// Used by client-only surfaces that need to react to the FlightAware
// flag — the "FlightAware" badge under the feed source, the
// great-circle predicted-route line, etc.
//
// Clerk caches publicMetadata inside the session JWT and the cached
// value can be up to ~60s stale after a dashboard edit. To flip the
// flag immediately we call user.reload() once per user identity change
// — that pulls the latest user record (including publicMetadata) from
// Clerk's API and re-renders the hook with the fresh value.
export function useFlightAwareEnabled() {
  const { isLoaded, isSignedIn, user } = useUser();
  const reloadedFor = useRef("");
  const hasUser = Boolean(isLoaded && isSignedIn && user);
  const entity = hasUser ? buildClerkUserAccessEntity(user) : null;
  const enabled = entity ? isFlightAwareOwnerEntity(entity) : false;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    if (reloadedFor.current === user.id) return;
    reloadedFor.current = user.id;
    user.reload?.().catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[flightaware-enabled] user.reload() failed", error);
      }
    });
  }, [isLoaded, isSignedIn, user]);

  // Dev-only trace, deduped across the whole app: each consumer of the
  // hook re-renders independently, and several of them re-run on every
  // poll, so emitting unconditionally floods the console. Only log when
  // the resolved signature changes — the first true → true repeat is
  // suppressed, but a flip back to undefined / a different user shows
  // up immediately.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !hasUser) return;
    const raw = user.publicMetadata?.flightAwareEnabled;
    const signature = `${user.id}|${JSON.stringify(raw)}|${typeof raw}|${enabled}`;
    if (signature !== lastLoggedSignature) {
      lastLoggedSignature = signature;
      console.info(
        `[flightaware-enabled] clerkUser=${user.id} primaryEmail=${user.primaryEmailAddress?.emailAddress || "(none)"} flightAwareEnabled.raw=${JSON.stringify(raw)} typeof=${typeof raw} → ${enabled}`,
      );
    }
  }, [enabled, hasUser, user]);

  return enabled;
}
