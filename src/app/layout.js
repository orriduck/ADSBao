/* eslint-disable @next/next/no-page-custom-font */
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { Toaster } from "sonner";
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <ThemeBootScript />
        <div className="min-h-dvh bg-atc-bg text-atc-text">{children}</div>
        <Toaster
          theme="system"
          position="top-right"
          toastOptions={{ className: "atc-toast" }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

function ThemeBootScript() {
  return (
    <Script id="theme-boot" strategy="beforeInteractive">
      {`
        (() => {
          const themes = new Set(["light", "dark", "system"]);
          const stored = window.localStorage.getItem("theme");
          const preference = themes.has(stored) ? stored : "system";
          const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          document.documentElement.setAttribute(
            "data-theme",
            preference === "system" ? (systemDark ? "dark" : "light") : preference
          );
        })();
      `}
    </Script>
  );
}
