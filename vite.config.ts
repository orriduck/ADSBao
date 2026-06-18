import { readFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version?: string };
const ADSBAO_APP_VERSION = String(packageJson.version || "0.0.0");

function appVersionManifestPlugin(version: string): Plugin {
  const payload = () => `${JSON.stringify({ version }, null, 2)}\n`;
  return {
    name: "adsbao-app-version-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/adsbao-version.json") {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(payload());
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "adsbao-version.json",
        source: payload(),
      });
    },
  };
}

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
    plugins: [react(), tailwindcss(), appVersionManifestPlugin(ADSBAO_APP_VERSION)],
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
