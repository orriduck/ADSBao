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

export function resolveSpotCoordinates(spot: SpotNavigationTarget | null | undefined) {
  const coordinate = (value: unknown) => {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const lat = coordinate(spot?.lat);
  const lon = coordinate(spot?.lon);
  if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

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
  const coordinates = resolveSpotCoordinates(spot);
  if (!coordinates) return null;
  const { lat: latitude, lon: longitude } = coordinates;

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
