import { buildAdsbaoServiceWorkerSource } from "./src/features/app-shell/serviceWorkerSource";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  ADSBAO_PWA_PUBLIC_ASSET_PATHS,
  shouldPrecacheViteChunk,
} from "./src/features/app-shell/pwaCachePolicy";
import { buildCloudflareHeadersFile } from "./src/config/securityHeaders";

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

function cloudflareStaticHeadersPlugin(): Plugin {
  return {
    name: "adsbao-cloudflare-static-headers",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source: buildCloudflareHeadersFile(),
      });
    },
  };
}

function runtimeEnvCacheBustPlugin(version: string): Plugin {
  return {
    name: "adsbao-runtime-env-cache-bust",
    transformIndexHtml(html) {
      return html.replace(
        'src="/runtime-env.js"',
        `src="/runtime-env.js?v=${encodeURIComponent(version)}"`,
      );
    },
  };
}

function retiredWebSocketRoutePlugin(): Plugin {
  return {
    name: "adsbao-retire-websocket-route",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/ws") {
          next();
          return;
        }
        res.statusCode = 404;
        res.setHeader("Cache-Control", "no-store");
        res.end();
      });
    },
  };
}

function adsbaoPwaServiceWorkerPlugin(version: string): Plugin {
  return {
    name: "adsbao-pwa-service-worker",
    generateBundle(_options, bundle) {
      const precacheUrls = collectAdsbaoPrecacheUrls(bundle);
      const revision = buildAdsbaoPrecacheRevision(precacheUrls);

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: buildAdsbaoServiceWorkerSource({
          cacheName: `adsbao-static-${version}-${revision}`,
          precacheUrls,
        }),
      });
    },
  };
}

function buildAdsbaoPrecacheRevision(precacheUrls: string[]) {
  const hash = createHash("sha256").update(precacheUrls.join("\n"));

  // Include public bytes as well as their content-addressed URLs in the cache
  // revision, so every icon/manifest change installs a fresh static cache.
  for (const assetPath of ADSBAO_PWA_PUBLIC_ASSET_PATHS) {
    hash.update(`\n${assetPath}\n`);
    hash.update(
      readFileSync(new URL(`./public${assetPath}`, import.meta.url)),
    );
  }

  return hash.digest("hex").slice(0, 10);
}

function collectAdsbaoPrecacheUrls(bundle: Record<string, any>) {
  const urls = new Set<string>(["/"]);
  const chunksByFileName = new Map<string, any>();

  for (const item of Object.values(bundle)) {
    if (item?.type === "chunk") chunksByFileName.set(item.fileName, item);
  }

  const includeChunk = (fileName: string) => {
    const chunk = chunksByFileName.get(fileName);
    if (!chunk) return;
    urls.add(toPublicPath(chunk.fileName));
    for (const imported of chunk.imports || []) includeChunk(imported);
  };

  for (const chunk of chunksByFileName.values()) {
    if (
      shouldPrecacheViteChunk({
        isEntry: chunk.isEntry,
        moduleIds: chunk.moduleIds,
      })
    ) {
      includeChunk(chunk.fileName);
    }
  }

  for (const item of Object.values(bundle)) {
    if (item?.type === "asset" && String(item.fileName).endsWith(".css")) {
      urls.add(toPublicPath(item.fileName));
    }
  }

  for (const asset of ADSBAO_PWA_PUBLIC_ASSET_PATHS) urls.add(asset);
  return [...urls].sort();
}

function toPublicPath(fileName: string) {
  return `/${String(fileName).replace(/^\/+/, "")}`;
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const localApiOrigin =
    env.VITE_ADSBAO_LOCAL_API_ORIGIN ||
    env.ADSBAO_LOCAL_API_ORIGIN ||
    "http://localhost:8082";
  const clientEnv = {
    NODE_ENV: mode === "production" ? "production" : "development",
    VITE_SITE_URL: env.VITE_SITE_URL || env.ADSBAO_SITE_URL || "https://adsbao.dev",
    VITE_AIRCRAFT_PHOTOS_BASE: env.VITE_AIRCRAFT_PHOTOS_BASE || "",
    VITE_AIRCRAFT_POSITIONS_BASE: env.VITE_AIRCRAFT_POSITIONS_BASE || "",
    VITE_AIRCRAFT_TRACE_BASE: env.VITE_AIRCRAFT_TRACE_BASE || "",
    VITE_LOCAL_WEATHER_BASE: env.VITE_LOCAL_WEATHER_BASE || "",
    VITE_METAR_PROXY_BASE: env.VITE_METAR_PROXY_BASE || "",
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      appVersionManifestPlugin(ADSBAO_APP_VERSION),
      cloudflareStaticHeadersPlugin(),
      runtimeEnvCacheBustPlugin(ADSBAO_APP_VERSION),
      retiredWebSocketRoutePlugin(),
      adsbaoPwaServiceWorkerPlugin(ADSBAO_APP_VERSION),
    ],
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT) || 3000,
      strictPort: true,
      proxy: {
        "/api": {
          target: localApiOrigin,
          changeOrigin: true,
        },
        "/events": {
          target: localApiOrigin,
          changeOrigin: true,
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
