import { withSentryConfig } from "@sentry/nextjs";

import { resolveSentryPluginOptions } from "./src/config/sentryConfig.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live https://www.youtube.com https://s.ytimg.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://airportsapi.com https://*.wikipedia.org https://*.vercel-insights.com https://vitals.vercel-insights.com https://*.clerk.accounts.dev https://*.clerk.com; frame-src https://www.youtube.com https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'; form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(
  nextConfig,
  resolveSentryPluginOptions(process.env),
);
