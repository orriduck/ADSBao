export const FEATURE_FLAGS = Object.freeze({
  FLIGHTAWARE_ENABLED: "flightAwareEnabled",
});

export const FEATURE_FLAG_ENVIRONMENTS = Object.freeze({
  LOCAL: "local",
  PREVIEW: "preview",
  PRODUCTION: "production",
});

const ENVIRONMENT_ALIASES = Object.freeze({
  development: FEATURE_FLAG_ENVIRONMENTS.LOCAL,
  local: FEATURE_FLAG_ENVIRONMENTS.LOCAL,
  preview: FEATURE_FLAG_ENVIRONMENTS.PREVIEW,
  production: FEATURE_FLAG_ENVIRONMENTS.PRODUCTION,
});

export function normalizeUserEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeFeatureFlagEnvironment(environment) {
  const normalized = String(environment || "").trim().toLowerCase();
  if (!normalized) return FEATURE_FLAG_ENVIRONMENTS.LOCAL;
  const mapped = ENVIRONMENT_ALIASES[normalized];
  if (mapped) return mapped;
  throw new Error(
    `Expected feature flag environment to be one of: ${Object.values(FEATURE_FLAG_ENVIRONMENTS).join(", ")}`,
  );
}

export function resolveFeatureFlagEnvironment(env = process.env) {
  return normalizeFeatureFlagEnvironment(
    env.FEATURE_FLAGS_ENV || env.VERCEL_ENV || FEATURE_FLAG_ENVIRONMENTS.LOCAL,
  );
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
