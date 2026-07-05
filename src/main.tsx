import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@/platform/auth/clerkClient";
import AppUpdateToast from "@/components/app-shell/AppUpdateToast";
import ThemedToaster from "@/components/app-shell/ThemedToaster";
import QueryProvider from "@/features/app-shell/queryProvider";
import { registerAdsbaoServiceWorker } from "@/features/app-shell/registerServiceWorker";
import { I18nProvider } from "@/features/app-shell/i18n/i18nProvider";
import {
  DEFAULT_LOCALE,
  normalizeLocaleSelection,
  resolveLocaleFromSearchParams,
} from "@/features/app-shell/i18n/i18nModel";
import { UnitPreferencesProvider } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { NotificationPreferencesProvider } from "@/features/notifications/NotificationPreferencesProvider";
import WebMcpProvider from "@/features/webmcp/WebMcpProvider";
import { runtimeEnvValue } from "@/platform/env/runtimeEnv";
import { isConcreteTheme } from "@/utils/theme";
import App from "./App";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

function resolveInitialTheme() {
  const raw = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("theme="))
    ?.split("=")[1];
  const decoded = raw ? decodeURIComponent(raw) : "";
  return isConcreteTheme(decoded) ? decoded : "dark";
}

function resolveInitialLocale() {
  const params = new URLSearchParams(window.location.search);
  const legacyLocale = params.get("lang");
  return (
    resolveLocaleFromSearchParams(window.location.search) ||
    (legacyLocale ? normalizeLocaleSelection(legacyLocale, DEFAULT_LOCALE) : null) ||
    navigator.language ||
    DEFAULT_LOCALE
  );
}

function applyDocumentShell() {
  const initialTheme = resolveInitialTheme();
  document.documentElement.dataset.theme = initialTheme;
  const realtimeUrl = runtimeEnvValue(
    "VITE_ADSBAO_REALTIME_URL",
    import.meta.env.VITE_ADSBAO_REALTIME_URL || "",
  );
  if (realtimeUrl) {
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="adsbao-realtime-url"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "adsbao-realtime-url";
      document.head.appendChild(meta);
    }
    meta.content = realtimeUrl;
  }
  return { initialTheme };
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

const { initialTheme } = applyDocumentShell();
registerAdsbaoServiceWorker();

createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider>
        <I18nProvider initialLocale={resolveInitialLocale()}>
          <QueryProvider>
            <UnitPreferencesProvider>
              <NotificationPreferencesProvider>
                <WebMcpProvider />
                <AppUpdateToast />
                <div className="min-h-dvh bg-atc-bg text-atc-text">
                  <App />
                </div>
              </NotificationPreferencesProvider>
            </UnitPreferencesProvider>
          </QueryProvider>
        </I18nProvider>
        <ThemedToaster
          initialTheme={initialTheme}
          className="atc-toaster"
          position="top-right"
          offset={{ top: 64 }}
          mobileOffset={{ top: 64 }}
          toastOptions={{ className: "atc-toast" }}
        />
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
