import NearMeScreen from "@/components/screens/NearMeScreen";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

export const metadata = {
  title: `Near me · ${SITE_NAME}`,
  description: `${SITE_DESCRIPTION} — live aircraft around your current location.`,
  alternates: { canonical: "/here" },
  openGraph: {
    type: "website",
    url: "/here",
    siteName: SITE_NAME,
    title: `Near me · ${SITE_NAME}`,
    description: `${SITE_DESCRIPTION} — live aircraft around your current location.`,
  },
};

// `/here` — explorer view centered on the user's current location.
// All client behavior lives inside `NearMeScreen`; the route file
// just owns SEO metadata.
export default function NearMePage() {
  return <NearMeScreen />;
}
