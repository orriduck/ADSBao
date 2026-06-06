export const FEATURE_FLAGS = Object.freeze({
  FLIGHTAWARE_ENABLED: "flightAwareEnabled",
  PLANE_HUNTER_ENABLED: "planeHunterEnabled",
});

const FEATURE_FLAG_ENVIRONMENTS = Object.freeze({
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

type ClerkEmailAddress = {
  emailAddress?: unknown;
};

type ClerkFeatureFlagUser = {
  id?: unknown;
  primaryEmailAddress?: ClerkEmailAddress | null;
  publicMetadata?: unknown;
};

export function normalizeUserEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeFeatureFlagEnvironment(environment: unknown) {
  const normalized = String(environment || "").trim().toLowerCase();
  if (!normalized) return FEATURE_FLAG_ENVIRONMENTS.LOCAL;
  const mapped = ENVIRONMENT_ALIASES[normalized];
  if (mapped) return mapped;
  throw new Error(
    `Expected feature flag environment to be one of: ${Object.values(FEATURE_FLAG_ENVIRONMENTS).join(", ")}`,
  );
}

export function resolveFeatureFlagEnvironment(env: Record<string, string | undefined> = process.env) {
  return normalizeFeatureFlagEnvironment(
    env.FEATURE_FLAGS_ENV || env.VERCEL_ENV || FEATURE_FLAG_ENVIRONMENTS.LOCAL,
  );
}

export function getClerkUserPrimaryEmail(user: ClerkFeatureFlagUser | null | undefined) {
  return normalizeUserEmail(user?.primaryEmailAddress?.emailAddress);
}

export function normalizeFeatureFlags(flags: unknown) {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) return {};

  return Object.fromEntries(
    Object.entries(flags).map(([key, value]) => [String(key), value === true]),
  );
}

export function isFeatureFlagEnabled(flags: unknown, flagKey: string) {
  return normalizeFeatureFlags(flags)[flagKey] === true;
}
