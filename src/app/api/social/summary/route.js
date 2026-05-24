import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import { createSocialRepositoryFromEnv } from "@/app/api/dao/social.dao.js";
import {
  getSocialSessionHash,
  normalizeSocialSummarySearchParams,
} from "../socialRouteModel.js";

const rateLimit = {
  key: "social:summary",
  maxRequests: 90,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request, {
    allowedMethods: ["GET", "OPTIONS"],
  });
}

export async function GET(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const url = new URL(request.url);
  const normalized = normalizeSocialSummarySearchParams(url.searchParams);
  if (!normalized.ok) {
    return jsonProxyResponse(request, { error: normalized.error }, { status: 400 });
  }

  const repo = createSocialRepositoryFromEnv();
  if (!repo) {
    return jsonProxyResponse(
      request,
      { error: "Social storage unavailable" },
      { status: 503 },
    );
  }

  let summary;
  try {
    summary = await repo.readSummary({
      ...normalized.value,
      sessionHash: getSocialSessionHash(request),
    });
  } catch (err) {
    console.error("[social-summary] read failed:", err);
    return jsonProxyResponse(
      request,
      { error: "Could not read social summary" },
      { status: 500 },
    );
  }

  return Response.json(summary, {
    status: 200,
    headers: buildProxyHeaders(
      request,
      { "Cache-Control": "no-store" },
      { varyOrigin: false },
    ),
  });
}
