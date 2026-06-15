import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clientEnv = {
    NODE_ENV: mode === "production" ? "production" : "development",
    VITE_ADSBAO_REALTIME_URL: env.VITE_ADSBAO_REALTIME_URL || "",
    VITE_CLERK_PUBLISHABLE_KEY: env.VITE_CLERK_PUBLISHABLE_KEY || "",
    VITE_SITE_URL: env.VITE_SITE_URL || env.ADSBAO_SITE_URL || "https://adsbao.dev",
    VITE_AIRCRAFT_PHOTOS_BASE: env.VITE_AIRCRAFT_PHOTOS_BASE || "",
    VITE_AIRCRAFT_POSITIONS_BASE: env.VITE_AIRCRAFT_POSITIONS_BASE || "",
    VITE_AIRCRAFT_TRACE_BASE: env.VITE_AIRCRAFT_TRACE_BASE || "",
    VITE_LOCAL_WEATHER_BASE: env.VITE_LOCAL_WEATHER_BASE || "",
    VITE_METAR_PROXY_BASE: env.VITE_METAR_PROXY_BASE || "",
  };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      strictPort: true,
    },
    preview: {
      port: 3000,
      strictPort: true,
    },
    define: {
      "process.env": JSON.stringify(clientEnv),
    },
    resolve: {
      alias: {
        "@": new URL("src", import.meta.url).pathname,
      },
    },
  };
});
