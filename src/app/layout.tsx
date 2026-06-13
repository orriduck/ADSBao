/* eslint-disable @next/next/no-page-custom-font */
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { getLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThemedToaster from "@/components/app-shell/ThemedToaster";
import { I18nProvider } from "@/features/app-shell/i18n/i18nProvider";
import QueryProvider from "@/features/app-shell/queryProvider";
import { UnitPreferencesProvider } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import WebMcpProvider from "@/features/webmcp/WebMcpProvider";
import { isConcreteTheme } from "@/utils/theme";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_SOCIAL_IMAGE,
  SITE_TITLE,
  getSocialImageUrl,
  getSiteUrl,
} from "@/config/site";
import "../style.css";

const socialImage = {
  url: getSocialImageUrl(),
  width: SITE_SOCIAL_IMAGE.width,
  height: SITE_SOCIAL_IMAGE.height,
  type: SITE_SOCIAL_IMAGE.type,
  alt: SITE_SOCIAL_IMAGE.alt,
};

export const metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
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
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [socialImage],
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
// RESOLVED theme, never "system": useThemePreference
// rewrites it on every applyThemePreference call, so even users on
// system preference get the correct color on subsequent loads. First-
// ever visitors without a cookie still fall back to dark, since the
// server can't see matchMedia.
async function resolveInitialTheme() {
  const store = await cookies();
  const raw = store.get("theme")?.value;
  if (isConcreteTheme(raw)) return raw;
  return "dark";
}

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const initialTheme = await resolveInitialTheme();
  const realtimeUrl = process.env.NEXT_PUBLIC_ADSBAO_REALTIME_URL || "";
  return (
    <html
      lang={locale}
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <meta name="adsbao-realtime-url" content={realtimeUrl} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ADSBao" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClerkProvider>
          <I18nProvider initialLocale={locale}>
            <QueryProvider>
              <UnitPreferencesProvider>
                <WebMcpProvider />
                <div className="min-h-dvh bg-atc-bg text-atc-text">{children}</div>
              </UnitPreferencesProvider>
            </QueryProvider>
          </I18nProvider>
          <ThemedToaster
            initialTheme={initialTheme}
            className="atc-toaster"
            position="top-right"
            // Drop below the 44px airport-map toolbar at top:0.
            offset={{ top: 64 }}
            mobileOffset={{ top: 64 }}
            toastOptions={{ className: "atc-toast" }}
          />
          <Analytics />
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
