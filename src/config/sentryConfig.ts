export function resolveTraceSampleRate(env = process.env) {
  return env.NODE_ENV === "development" ? 1 : 0.1;
}

export function resolveClientSentryConfig(env = process.env) {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN || undefined;

  return {
    dsn,
    enabled: Boolean(dsn),
    tracesSampleRate: resolveTraceSampleRate(env),
  };
}

export function resolveServerSentryConfig(env = process.env) {
  const dsn = env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN || undefined;

  return {
    dsn,
    enabled: Boolean(dsn),
    tracesSampleRate: resolveTraceSampleRate(env),
  };
}

export function resolveSentryPluginOptions(env = process.env) {
  const options = {
    silent: !env.CI,
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
  };

  if (env.SENTRY_ORG) options.org = env.SENTRY_ORG;
  if (env.SENTRY_PROJECT) options.project = env.SENTRY_PROJECT;
  if (env.SENTRY_AUTH_TOKEN) options.authToken = env.SENTRY_AUTH_TOKEN;

  return options;
}
