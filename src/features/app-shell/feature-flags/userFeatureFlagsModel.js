export const FEATURE_FLAGS = Object.freeze({
  FLIGHTAWARE_ENABLED: "flightAwareEnabled",
});

export function normalizeUserEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getClerkUserPrimaryEmail(user) {
  return normalizeUserEmail(user?.primaryEmailAddress?.emailAddress);
}

export function normalizeFeatureFlags(flags) {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) return {};

  return Object.fromEntries(
    Object.entries(flags).map(([key, value]) => [String(key), value === true]),
  );
}

export function isFeatureFlagEnabled(flags, flagKey) {
  return normalizeFeatureFlags(flags)[flagKey] === true;
}

export function buildUserFeatureFlagAccessEntity({ user, flags = {} } = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!user || !email) return undefined;

  const normalizedFlags = normalizeFeatureFlags(flags);
  return {
    id: user.id ? String(user.id) : "",
    email,
    flags: normalizedFlags,
    flightAwareEnabled: isFeatureFlagEnabled(
      normalizedFlags,
      FEATURE_FLAGS.FLIGHTAWARE_ENABLED,
    ),
  };
}
