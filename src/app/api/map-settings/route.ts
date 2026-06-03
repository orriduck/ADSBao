import { currentUser } from "@clerk/nextjs/server";

import {
  persistMapSettingsForUser,
  resolveMapSettingsForUser,
} from "@/features/airport/map-settings/userMapSettings.server";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  const settings = await resolveMapSettingsForUser({ user });

  return Response.json(
    {
      signedIn: Boolean(user),
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
  const settings = await persistMapSettingsForUser({
    user,
    settings: body?.settings,
  });

  return Response.json(
    {
      signedIn: true,
      settings,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
