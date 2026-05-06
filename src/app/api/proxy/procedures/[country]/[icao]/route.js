import { buildLiveAirportProcedurePayload } from "@/services/procedures/faaCifpLiveDataClient.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export const runtime = "nodejs";

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(_request, { params }) {
  const { country = "", icao = "" } = await params;
  const normalizedCountry = country.toUpperCase();
  const normalizedIcao = icao.toUpperCase();

  if (normalizedCountry !== "US" || !/^K[A-Z0-9]{3}$/.test(normalizedIcao)) {
    return Response.json(
      { error: "FAA CIFP procedures are available for US ICAO airports only" },
      { status: 404, headers: corsHeaders },
    );
  }

  try {
    const payload = await buildLiveAirportProcedurePayload({
      airport: normalizedIcao,
    });

    if (!payload.index.approaches.length && !payload.runwayMap.runways.length) {
      return Response.json(
        { error: `No FAA CIFP airport data found for ${normalizedIcao}` },
        { status: 404, headers: corsHeaders },
      );
    }

    return Response.json(payload, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(`[procedures] FAA CIFP load failed for ${normalizedIcao}`, error);
    return Response.json(
      { error: "Failed to load FAA CIFP procedures" },
      { status: 502, headers: corsHeaders },
    );
  }
}
