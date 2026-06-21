export type SpotNavigationPlatform = "apple" | "android" | "generic";

export type SpotNavigationTarget = {
  lat?: unknown;
  lon?: unknown;
  name?: unknown;
  title?: unknown;
  category?: unknown;
};

export type SpotNavigationLinks = {
  nativeMapUrl: string;
  googleMapsUrl: string;
  label: string;
  platform: SpotNavigationPlatform;
};

export function resolveSpotNavigationPlatform(userAgent = ""): SpotNavigationPlatform {
  const normalized = String(userAgent || "");
  if (/Android/i.test(normalized)) return "android";
  if (/(iPhone|iPad|iPod|Macintosh)/i.test(normalized)) return "apple";
  return "generic";
}

export function buildSpotNavigationLinks(
  spot: SpotNavigationTarget | null | undefined,
  {
    userAgent = "",
    fallbackLabel = "Photo spot",
  }: { userAgent?: string; fallbackLabel?: string } = {},
): SpotNavigationLinks | null {
  const latitude = Number(spot?.lat);
  const longitude = Number(spot?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const latitudeLabel = formatNavigationCoordinate(latitude);
  const longitudeLabel = formatNavigationCoordinate(longitude);
  const label = String(
    spot?.name || spot?.title || spot?.category || fallbackLabel,
  ).trim() || fallbackLabel;
  const platform = resolveSpotNavigationPlatform(userAgent);
  const destination = `${latitudeLabel},${longitudeLabel}`;
  const googleParams = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });

  return {
    nativeMapUrl:
      platform === "android"
        ? `geo:${destination}?q=${encodeURIComponent(`${destination}(${label})`)}`
        : appleMapsUrl({ destination, label }),
    googleMapsUrl: `https://www.google.com/maps/dir/?${googleParams.toString()}`,
    label,
    platform,
  };
}

function appleMapsUrl({
  destination,
  label,
}: {
  destination: string;
  label: string;
}) {
  const params = new URLSearchParams({
    daddr: destination,
    q: label,
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

function formatNavigationCoordinate(value: number) {
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
