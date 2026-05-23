/* eslint-disable @next/next/no-page-custom-font */
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThemedToaster from "@/components/app-shell/ThemedToaster.jsx";
import { I18nProvider } from "@/features/app-shell/i18n/i18nProvider.jsx";
import "leaflet/dist/leaflet.css";
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

// Same cookie pattern as theme — usePrimaryColor writes the resolved
// primary on every change, and SSR reads it here so the html tag is
// rendered with the right data-primary on cold load (no flash of the
// default yellow palette before the client hook runs).
async function resolveInitialPrimary() {
  const store = await cookies();
  const raw = store.get("primary")?.value;
  if (raw === "yellow" || raw === "teal") return raw;
  return "yellow";
}

export default async function RootLayout({ children }) {
  const initialTheme = await resolveInitialTheme();
  const initialPrimary = await resolveInitialPrimary();
  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-primary={initialPrimary}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,300..900;1,300..900&family=Noto+Sans+SC:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClerkProvider>
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
        </ClerkProvider>
      </body>
    </html>
  );
}
