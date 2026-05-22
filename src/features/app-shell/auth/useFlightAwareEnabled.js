"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { buildClerkUserAccessEntity, isFlightAwareOwnerEntity } from "./clerkRouteProviderAccess.js";

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

  if (!isLoaded || !isSignedIn || !user) return false;
  const entity = buildClerkUserAccessEntity(user);
  const enabled = isFlightAwareOwnerEntity(entity);

  // Dev-only single-line trace so the gating decision is visible in the
  // browser console — exact value of publicMetadata.flightAwareEnabled,
  // its type, and the resolved boolean. Mirrors the server-side gate
  // log in flightRoutes.mechanism.js.
  if (process.env.NODE_ENV !== "production") {
    const raw = user.publicMetadata?.flightAwareEnabled;
    console.info(
      `[flightaware-enabled] clerkUser=${user.id} primaryEmail=${user.primaryEmailAddress?.emailAddress || "(none)"} flightAwareEnabled.raw=${JSON.stringify(raw)} typeof=${typeof raw} → ${enabled}`,
    );
  }
  return enabled;
}
