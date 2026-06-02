import { FEATURED_AIRPORT_CODES, getAbsoluteUrl } from "@/config/site";

const STATIC_ROUTES = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/about",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/mechanism",
    changeFrequency: "monthly",
    priority: 0.6,
  },
];

export default function sitemap() {
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: getAbsoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...FEATURED_AIRPORT_CODES.map((icao) => ({
      url: getAbsoluteUrl(`/airport/${icao}`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    })),
  ];
}
