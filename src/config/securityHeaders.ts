const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://airportsapi.com https://*.wikipedia.org https://tiles.openfreemap.org https://*.tile.opentopomap.org https://s3.amazonaws.com; frame-src https://www.youtube.com https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'; form-action 'self'",
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

export function buildCloudflareHeadersFile() {
  const lines = [
    "/*",
    ...securityHeaders.map(({ key, value }) => `  ${key}: ${value}`),
    "",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/adsbao-version.json",
    "  Cache-Control: no-store",
    "",
    "/sw.js",
    "  Cache-Control: no-cache, no-store, must-revalidate",
    "",
    "/manifest.380ac4df1b.webmanifest",
    "  Cache-Control: public, max-age=0, must-revalidate",
  ];

  return `${lines.join("\n")}\n`;
}
