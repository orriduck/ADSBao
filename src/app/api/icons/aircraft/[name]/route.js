import { promises as fs } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/services/apiProxySecurity.js";
import { isKnownAircraftIconName } from "@/utils/aircraftIcon.js";

// Aircraft silhouettes are sourced from the "ADS-B Radar Free Aircraft SVG
// Icons" set (https://adsb-radar.com/help/icons.html — see the resolver in
// src/utils/aircraftIcon.js for attribution). Run `pnpm icons:aircraft` to
// pull the full set into `public/icons/aircraft/`. The route serves the SVGs
// from disk so we never depend on the upstream CDN at request time and falls
// back to the bundled `arrow.svg` (which mirrors the UI's inline arrow path)
// for any name we recognize but haven't downloaded yet. Same-origin serving
// also keeps `mask-image` tinting working without CORS friction.

const ICON_DIR = join(process.cwd(), "public", "icons", "aircraft");
const FALLBACK_NAME = "arrow";
const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L16 20L12 17L8 20Z" fill="black"/></svg>';
const MAX_BYTES = 64 * 1024;

const rateLimit = {
  key: "proxy:aircraft-icons",
  maxRequests: 240,
  windowMs: 60_000,
};

const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

export const runtime = "nodejs";

const readIconFile = async (name) => {
  try {
    const buffer = await fs.readFile(join(ICON_DIR, `${name}.svg`));
    if (buffer.byteLength > MAX_BYTES) return null;
    return buffer;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { name } = await params;
  const requested = isKnownAircraftIconName(name) ? name : null;

  try {
    let body = requested ? await readIconFile(requested) : null;
    let servedName = requested;

    if (!body) {
      body = await readIconFile(FALLBACK_NAME);
      servedName = FALLBACK_NAME;
    }

    if (!body) {
      body = FALLBACK_SVG;
      servedName = "inline-arrow";
    }

    return new Response(body, {
      status: 200,
      headers: buildProxyHeaders(request, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        "X-Aircraft-Icon-Name": servedName,
        "X-Aircraft-Icon-Requested": requested || "",
      }),
    });
  } catch (error) {
    console.error("[aircraft-icons] disk read failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft icon" },
      { status: 500 },
    );
  }
}
