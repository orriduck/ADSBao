import * as Sentry from "@sentry/nextjs";

import { resolveServerSentryConfig } from "./config/sentryConfig";

Sentry.init({
  ...resolveServerSentryConfig(process.env),
  sendDefaultPii: false,
  includeLocalVariables: process.env.NODE_ENV === "development",
});
