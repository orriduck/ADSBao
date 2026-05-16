import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/services/apiProxySecurity.js";
import {
  getAircraftIcon,
} from "@/features/aircraft-icons/aircraftIcons.mechanism.js";
import {
  AIRCRAFT_ICON_CACHE_CONTROL,
} from "@/features/aircraft-icons/aircraftIcons.models.js";

// Aircraft silhouettes are sourced from RexKramer1/AircraftShapesSVG
// (GPL-3.0). The SVGs ship in the repo under `public/icons/aircraft/`; see
// `public/icons/aircraft/ATTRIBUTION.md` for attribution and the local-rename
// notes. The route serves them same-origin so CSS `mask-image` tinting works
// without CORS friction and falls back to an inline arrow SVG when an ident
// has no on-disk silhouette.

const rateLimit = {
  key: "proxy:aircraft-icons",
  maxRequests: 240,
  windowMs: 60_000,
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { name } = await params;

  try {
    const icon = await getAircraftIcon({ name });

    return new Response(icon.body, {
      status: 200,
      headers: buildProxyHeaders(request, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": AIRCRAFT_ICON_CACHE_CONTROL,
        "X-Aircraft-Icon-Name": icon.servedName,
        "X-Aircraft-Icon-Requested": icon.requested,
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
