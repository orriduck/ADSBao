import FlightScreen from "@/components/screens/FlightScreen";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

const normalizeCallsign = (value) =>
  String(value || "").trim().toUpperCase();

export async function generateMetadata({ params }) {
  const { callsign } = await params;
  const normalized = normalizeCallsign(callsign);
  const path = normalized ? `/aircraft/${normalized}` : "/";
  const title = normalized
    ? `${normalized} - Flight Tracking`
    : SITE_NAME;
  const description = normalized
    ? `${SITE_NAME} live flight tracking for ${normalized}: position, telemetry, route, and aircraft metadata.`
    : SITE_DESCRIPTION;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function FlightPage({ params }) {
  const { callsign } = await params;
  return <FlightScreen callsign={normalizeCallsign(callsign)} />;
}
