import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import { createOurAirportsQueriesFromEnv } from "@/app/api/dao/airportDirectory.dao";
import { createRouteFeedbackReportsRepositoryFromEnv } from "@/app/api/dao/routeFeedbackReports.dao";
import {
  buildRouteFeedbackInsertSpec,
  normalizeRouteFeedbackInput,
} from "./routeFeedbackHandlerModel";

const rateLimit = {
  key: "proxy:route-feedback",
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

  const normalized = normalizeRouteFeedbackInput(rawBody);
  if (!normalized.ok) {
    return jsonProxyResponse(request, { error: normalized.error }, { status: 400 });
  }
  const input = normalized.value;

  const airportDirectory = createOurAirportsQueriesFromEnv();
  if (!airportDirectory) {
    return jsonProxyResponse(
      request,
      { error: "Airport directory unavailable" },
      { status: 503 },
    );
  }

  let originAirport;
  let destinationAirport;
  try {
    [originAirport, destinationAirport] = await Promise.all([
      airportDirectory.getAirportByIdent(input.originIcao),
      airportDirectory.getAirportByIdent(input.destinationIcao),
    ]);
  } catch (err) {
    console.error("[route-feedback] airport lookup failed:", err);
    return jsonProxyResponse(
      request,
      { error: "Airport lookup failed" },
      { status: 502 },
    );
  }

  if (!originAirport || !destinationAirport) {
    return jsonProxyResponse(
      request,
      { error: "Unknown origin or destination ICAO" },
      { status: 422 },
    );
  }

  const spec = buildRouteFeedbackInsertSpec({
    input,
    originAirport,
    destinationAirport,
  });
  if (!spec) {
    return jsonProxyResponse(
      request,
      { error: "Could not build feedback route" },
      { status: 422 },
    );
  }

  const feedbackRepository = createRouteFeedbackReportsRepositoryFromEnv();
  if (!feedbackRepository) {
    return jsonProxyResponse(
      request,
      { error: "Route feedback storage unavailable" },
      { status: 503 },
    );
  }

  try {
    await feedbackRepository.writeFeedbackReport(spec.record);
  } catch (err) {
    console.error("[route-feedback] insert failed:", err);
    return jsonProxyResponse(
      request,
      { error: "Could not store route feedback" },
      { status: 500 },
    );
  }

  return Response.json(
    { ok: true, route: spec.route },
    {
      status: 200,
      headers: buildProxyHeaders(request, { "Cache-Control": "no-store" }, {
        varyOrigin: false,
      }),
    },
  );
}
