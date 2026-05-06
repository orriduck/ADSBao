import {
  buildOpenMeteoCurrentWeatherUrl,
  normalizeCoordinateParam,
} from "@/services/aviation/localWeatherProxyModel.js";

export async function GET(_request, { params }) {
  const { lat, lon } = await params;
  const latitude = normalizeCoordinateParam(lat);
  const longitude = normalizeCoordinateParam(lon);

  if (latitude == null || longitude == null) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = buildOpenMeteoCurrentWeatherUrl({ latitude, longitude });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ADSBao/0.8 (https://github.com/orriduck/ADSBao)",
    },
    next: {
      revalidate: 300,
    },
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}
