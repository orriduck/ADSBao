export type Env = CloudflareWorkerEnv;

const PROXIED_PREFIXES = ["/api/", "/events/"] as const;
const PROXIED_EXACT_PATHS = new Set(["/api", "/events", "/health"]);

export function isProxiedPath(pathname: string) {
  return (
    PROXIED_EXACT_PATHS.has(pathname) ||
    PROXIED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function buildRuntimeEnvScript(env: Env) {
  const runtimeEnv = {
    VITE_NEW_RELIC_ACCOUNT_ID: env.VITE_NEW_RELIC_ACCOUNT_ID || "",
    VITE_NEW_RELIC_BROWSER_APP_ID: env.VITE_NEW_RELIC_BROWSER_APP_ID || "",
    VITE_NEW_RELIC_BROWSER_LICENSE_KEY:
      env.VITE_NEW_RELIC_BROWSER_LICENSE_KEY || "",
  };

  return `window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, ${JSON.stringify(runtimeEnv)});\n`;
}

function noStoreHeaders(contentType: string) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  };
}

export async function handleRequest(request: Request, env: Env) {
  const { pathname } = new URL(request.url);

  if (pathname === "/ws") {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (pathname === "/runtime-env.js") {
    return new Response(buildRuntimeEnvScript(env), {
      headers: noStoreHeaders("application/javascript; charset=utf-8"),
    });
  }

  if (isProxiedPath(pathname)) {
    try {
      // Forward the original Request and return the backend Response untouched.
      // In particular, never consume the body: EventSource streams must remain
      // streaming across the Worker-to-Worker service binding.
      return await env.ADSBAO_BACKEND.fetch(request);
    } catch {
      return Response.json(
        { error: "backend_unavailable" },
        {
          status: 502,
          headers: noStoreHeaders("application/json; charset=utf-8"),
        },
      );
    }
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
