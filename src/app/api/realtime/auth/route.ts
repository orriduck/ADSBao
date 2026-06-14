import { currentUser } from "@clerk/nextjs/server";

import { isFlightAwareEnabledForUser } from "@/features/app-shell/feature-flags/userFeatureFlags.server";
import { signRealtimeProviderGrant } from "@/lib/realtime/realtimeAuthToken";

const REALTIME_GRANT_TTL_SECONDS = 5 * 60;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || "";
  if (provider.toLowerCase() !== "flightaware") {
    return Response.json(
      { error: "Unsupported realtime provider" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const secret = process.env.ADSBAO_REALTIME_AUTH_SECRET || "";
  if (!secret) {
    return Response.json(
      { error: "Realtime auth is not configured" },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const user = await currentUser();
  const allowed = await isFlightAwareEnabledForUser({ user });
  if (!allowed) {
    return Response.json(
      { error: "FlightAware realtime access is not enabled" },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const expiresAt = Math.floor(Date.now() / 1000) + REALTIME_GRANT_TTL_SECONDS;
  const token = signRealtimeProviderGrant({
    provider: "flightaware",
    secret,
    expiresAt,
  });

  return Response.json(
    { provider: "flightaware", token, expiresAt },
    { headers: noStoreHeaders() },
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}
