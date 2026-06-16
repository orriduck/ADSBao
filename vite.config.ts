import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const localApiOrigin =
    env.VITE_ADSBAO_LOCAL_API_ORIGIN ||
    env.ADSBAO_LOCAL_API_ORIGIN ||
    "http://localhost:8081";
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
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      proxy: {
        "/api": {
          target: localApiOrigin,
          changeOrigin: true,
        },
        "/ws": {
          target: localApiOrigin,
          changeOrigin: true,
          ws: true,
        },
        "/health": {
          target: localApiOrigin,
          changeOrigin: true,
        },
        "/debug": {
          target: localApiOrigin,
          changeOrigin: true,
        },
      },
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
