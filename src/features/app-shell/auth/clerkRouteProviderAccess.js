// Gate for the FlightAware route provider. The previous version
// hardcoded an email allowlist in source; this reads a per-user flag
// from Clerk publicMetadata so the list lives in Clerk, not the repo.
//
// Setting the flag (Clerk dashboard → user → Public metadata):
//   { "flightAwareEnabled": true }
//
// Only strict `=== true` unlocks the gate so a stray "true" string or
// truthy non-boolean can't accidentally enable the provider.
const FLAG_KEY = "flightAwareEnabled";

export function buildClerkUserAccessEntity(user) {
  if (!user?.id) return undefined;
  return {
    id: String(user.id),
    flightAwareEnabled: user.publicMetadata?.[FLAG_KEY] === true,
  };
}

export function isFlightAwareOwnerEntity(userEntity) {
  return userEntity?.flightAwareEnabled === true;
}
