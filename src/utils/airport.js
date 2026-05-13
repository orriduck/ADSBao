import { flagEmoji } from "./flag.js";

export const airportSubtitle = (airport) => {
  const flag = flagEmoji(airport?.country);
  const place =
    airport?.city && airport?.country
      ? `${airport.city} · ${airport.country}`
      : airport?.city || airport?.country || airport?.type_label || airport?.type || "Airport";
  return flag ? `${flag} ${place}` : place;
};
