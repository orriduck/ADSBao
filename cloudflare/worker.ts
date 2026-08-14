type Fetcher = {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
};

export type Env = {
  ASSETS: Fetcher;
  ADSBAO_SERVICE_ORIGIN?: string;
  VITE_NEW_RELIC_ACCOUNT_ID?: string;
  VITE_NEW_RELIC_BROWSER_APP_ID?: string;
  VITE_NEW_RELIC_BROWSER_LICENSE_KEY?: string;
};

type FetchImplementation = typeof fetch;

const PROXIED_PREFIXES = ["/api/", "/events/"] as const;
const PROXIED_EXACT_PATHS = new Set(["/api", "/events", "/health"]);

export function isProxiedPath(pathname: string) {
  return (
    PROXIED_EXACT_PATHS.has(pathname) ||
    PROXIED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function buildServiceUrl(requestUrl: string, rawOrigin: string) {
  const incoming = new URL(requestUrl);
  const origin = new URL(rawOrigin);
  if (!(["http:", "https:"] as string[]).includes(origin.protocol)) {
    throw new Error("Unsupported service origin protocol");
  }
  if (origin.username || origin.password) {
    throw new Error("Service origin must not contain credentials");
  }

  return new URL(`${incoming.pathname}${incoming.search}`, origin.origin);
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

async function proxyToService(
  request: Request,
  rawOrigin: string,
  fetchImpl: FetchImplementation,
) {
  const incoming = new URL(request.url);
  const target = buildServiceUrl(request.url, rawOrigin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", incoming.protocol.replace(/:$/, ""));

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  // Returning the upstream response without reading its body preserves SSE
  // streaming and avoids converting realtime traffic into buffered payloads.
  return fetchImpl(target, init);
}

export async function handleRequest(
  request: Request,
  env: Env,
  fetchImpl: FetchImplementation = fetch,
) {
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
    const serviceOrigin = env.ADSBAO_SERVICE_ORIGIN?.trim();
    if (!serviceOrigin) {
      return Response.json(
        { error: "backend_origin_not_configured" },
        {
          status: 503,
          headers: noStoreHeaders("application/json; charset=utf-8"),
        },
      );
    }

    try {
      return await proxyToService(request, serviceOrigin, fetchImpl);
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
