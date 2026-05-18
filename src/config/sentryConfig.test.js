import assert from "node:assert/strict";

import {
  resolveClientSentryConfig,
  resolveSentryPluginOptions,
  resolveServerSentryConfig,
  resolveTraceSampleRate,
} from "./sentryConfig.js";

{
  assert.equal(resolveTraceSampleRate({ NODE_ENV: "development" }), 1);
  assert.equal(resolveTraceSampleRate({ NODE_ENV: "production" }), 0.1);
}

{
  assert.deepEqual(
    resolveClientSentryConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    }),
    {
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      tracesSampleRate: 0.1,
    },
  );

  assert.deepEqual(resolveClientSentryConfig({ NODE_ENV: "production" }), {
    dsn: undefined,
    enabled: false,
    tracesSampleRate: 0.1,
  });
}

{
  assert.deepEqual(
    resolveServerSentryConfig({
      NODE_ENV: "development",
      SENTRY_DSN: "https://server@example.ingest.sentry.io/2",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    }),
    {
      dsn: "https://server@example.ingest.sentry.io/2",
      enabled: true,
      tracesSampleRate: 1,
    },
  );

  assert.deepEqual(
    resolveServerSentryConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    }),
    {
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      tracesSampleRate: 0.1,
    },
  );
}

{
  assert.deepEqual(resolveSentryPluginOptions({}), {
    silent: true,
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
  });

  assert.deepEqual(
    resolveSentryPluginOptions({
      CI: "true",
      SENTRY_ORG: "adsbao",
      SENTRY_PROJECT: "web",
      SENTRY_AUTH_TOKEN: "sntrys_token",
    }),
    {
      silent: false,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      org: "adsbao",
      project: "web",
      authToken: "sntrys_token",
    },
  );
}
