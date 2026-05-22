"use client";

import { useUser } from "@clerk/nextjs";
import { buildClerkUserAccessEntity, isFlightAwareOwnerEntity } from "./clerkRouteProviderAccess.js";

// Client-side mirror of isFlightAwareOwnerEntity. Resolves to true only
// when Clerk has finished loading, a user is signed in, and their
// publicMetadata sets { flightAwareEnabled: true }. Anyone else (signed
// out, loading, or without the flag) gets false.
//
// Used by map layers that should only paint while the user is on the
// FlightAware route provider — e.g. the great-circle predicted-route
// line that assumes the route metadata is trustworthy.
export function useFlightAwareEnabled() {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded || !isSignedIn || !user) return false;
  return isFlightAwareOwnerEntity(buildClerkUserAccessEntity(user));
}
