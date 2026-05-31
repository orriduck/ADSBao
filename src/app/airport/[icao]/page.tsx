import HomeScreen from "@/components/screens/HomeScreen";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { AIRPORT_FALLBACKS } from "@/data/airportFallbacks";

const normalizeIcao = (value) => String(value || "").trim().toUpperCase();

const getAirportSeo = (icao) => {
  const normalizedIcao = normalizeIcao(icao);
  const fallback = AIRPORT_FALLBACKS[normalizedIcao] || null;
  const airportName = fallback?.name || `${normalizedIcao} Airport`;
  const airportCodeLabel = fallback?.iata
    ? `${normalizedIcao} / ${fallback.iata}`
    : normalizedIcao;
  const placeLabel = [fallback?.city, fallback?.country].filter(Boolean).join(", ");
  const title = `${airportCodeLabel} - ${airportName}`;
  const description = normalizedIcao
    ? `${SITE_NAME} airport page for ${airportName}${placeLabel ? ` in ${placeLabel}` : ""}: METAR weather, nearby aircraft, route hints, and map overlays.`
    : SITE_DESCRIPTION;

  return {
    normalizedIcao,
    title,
    description,
  };
};

export async function generateMetadata({ params }) {
  const { icao } = await params;
  const seo = getAirportSeo(icao);
  const path = seo.normalizedIcao ? `/airport/${seo.normalizedIcao}` : "/";

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: `${seo.title} | ${SITE_NAME}`,
      description: seo.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.title} | ${SITE_NAME}`,
      description: seo.description,
    },
  };
}

// HomeScreen reads the airport ICAO from the URL via usePathname, so the
// route file just needs to render the screen — no props plumbing. SEO
// metadata still derives from `params` (the airport name lookup above).
export default function AirportPage() {
  return <HomeScreen />;
}
