import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import { createSocialRepositoryFromEnv } from "@/app/api/dao/social.dao.js";
import { normalizeSocialReactionInput } from "@/features/social/socialModel.js";
import { getSocialSessionHash } from "../socialRouteModel.js";

const rateLimit = {
  key: "social:reaction",
  maxRequests: 30,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request, {
    allowedMethods: ["POST", "OPTIONS"],
  });
}

export async function POST(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return jsonProxyResponse(request, { error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeSocialReactionInput(rawBody);
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

  const sessionHash = getSocialSessionHash(request, { rawBody });
  let result;
  try {
    result = await repo.toggleReaction({ ...normalized.value, sessionHash });
  } catch (err) {
    console.error("[social-reaction] toggle failed:", err);
    return jsonProxyResponse(
      request,
      { error: "Could not update reaction" },
      { status: 500 },
    );
  }

  return Response.json(
    { ok: true, ...result },
    {
      status: 200,
      headers: buildProxyHeaders(
        request,
        { "Cache-Control": "no-store" },
        { varyOrigin: false },
      ),
    },
  );
}
