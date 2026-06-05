import { currentUser } from "@clerk/nextjs/server";

import {
  persistMapSettingsForUser,
  resolveMapSettingsForUser,
} from "@/features/airport/map-settings/userMapSettings.server";
import { normalizeMapSettingsDevice } from "@/features/airport/map-settings/mapSettingsModel";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentUser();
  const url = new URL(request.url);
  const device = normalizeMapSettingsDevice(url.searchParams.get("device"));
  const settings = await resolveMapSettingsForUser({ user, device });

  return Response.json(
    {
      signedIn: Boolean(user),
      device,
      settings,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const device = normalizeMapSettingsDevice(body?.device);
  const settings = await persistMapSettingsForUser({
    user,
    device,
    settings: body?.settings,
  });

  return Response.json(
    {
      signedIn: true,
      device,
      settings,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
