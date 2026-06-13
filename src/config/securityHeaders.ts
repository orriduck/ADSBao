const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live https://www.youtube.com https://s.ytimg.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.adsbao.dev https://accounts.adsbao.dev https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:8080 wss://*.up.railway.app wss://*.adsbao.dev https://airportsapi.com https://*.wikipedia.org https://tiles.openfreemap.org https://*.tile.opentopomap.org https://s3.amazonaws.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.adsbao.dev https://accounts.adsbao.dev https://clerk-telemetry.com; frame-src https://www.youtube.com https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'; form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.adsbao.dev https://accounts.adsbao.dev",
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
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(self), payment=(), tools=(self), usb=(), browsing-topics=()",
  },
];

export function buildSecurityHeaders() {
  return [
    {
      source: "/:path*",
      headers: securityHeaders,
    },
  ];
}
