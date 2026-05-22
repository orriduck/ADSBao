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
    user.reload?.().catch(() => {
      // Network blip / Clerk transient — fine to ignore. If the reload
      // failed the cached value is still in place; next mount will try
      // again.
    });
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn || !user) return false;
  return isFlightAwareOwnerEntity(buildClerkUserAccessEntity(user));
}
