import { currentUser } from "@clerk/nextjs/server";

import {
  resolveFeatureFlagsForUser,
} from "@/features/app-shell/feature-flags/userFeatureFlags.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  const flags = await resolveFeatureFlagsForUser({ user });

  return Response.json(
    { flags },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
