import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

import { buildSecurityHeaders } from "./src/config/securityHeaders";
import { resolveSentryPluginOptions } from "./src/config/sentryConfig";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_ADSBAO_REALTIME_URL:
      process.env.NEXT_PUBLIC_ADSBAO_REALTIME_URL || "",
  },
  async headers() {
    return buildSecurityHeaders();
  },
};

export default withSentryConfig(
  withNextIntl(nextConfig),
  resolveSentryPluginOptions(process.env),
);
