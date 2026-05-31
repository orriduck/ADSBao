import * as Sentry from "@sentry/nextjs";

import { resolveClientSentryConfig } from "./config/sentryConfig";

const sentryConfig = resolveClientSentryConfig(process.env);

Sentry.init({
  ...sentryConfig,
  sendDefaultPii: false,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: sentryConfig.enabled ? 0.1 : 0,
  replaysOnErrorSampleRate: sentryConfig.enabled ? 1 : 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
