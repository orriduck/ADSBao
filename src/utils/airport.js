import { countryName, flagEmoji } from "./flag.js";

export const airportSubtitle = (airport) => {
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country) || airport?.country || "";
  const place =
    airport?.city && country
      ? `${airport.city} · ${country}`
      : airport?.city || country || airport?.type_label || airport?.type || "Airport";
  return flag ? `${flag} ${place}` : place;
};
