/* eslint-disable @next/next/no-page-custom-font */
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThemedToaster from "@/components/app-shell/ThemedToaster.jsx";
import { I18nProvider } from "@/features/app-shell/i18n/i18nProvider.jsx";
import "leaflet/dist/leaflet.css";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  getSiteUrl,
} from "@/config/site";
import "../style.css";

export const metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: "Chen Liang" }],
  creator: "Chen Liang",
  publisher: SITE_NAME,
  category: "aviation",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Resolve the theme from the request cookie so the server can render
// <html data-theme="..."> directly — no client-side boot script, no
// React 19 "script inside component" warning. The cookie carries the
// RESOLVED theme (light/dark), never "system": useThemePreference
// rewrites it on every applyThemePreference call, so even users on
// system preference get the correct color on subsequent loads. First-
// ever visitors without a cookie still fall back to dark, since the
// server can't see matchMedia.
async function resolveInitialTheme() {
  const store = await cookies();
  const raw = store.get("theme")?.value;
  if (raw === "light" || raw === "dark") return raw;
  return "dark";
}

export default async function RootLayout({ children }) {
  const initialTheme = await resolveInitialTheme();
  return (
    <html lang="en" data-theme={initialTheme} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Manrope:wght@200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <div className="min-h-dvh bg-atc-bg text-atc-text">{children}</div>
        </I18nProvider>
        <ThemedToaster
          initialTheme={initialTheme}
          position="top-right"
          // Drop below the 44px airport-map toolbar at top:0.
          offset={{ top: 64 }}
          toastOptions={{ className: "atc-toast" }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
