export const OUR_AIRPORTS_BASE_URL =
  "https://davidmegginson.github.io/ourairports-data";

export const OUR_AIRPORTS_DATASETS = Object.freeze({
  airports: {
    key: "airports",
    filename: "airports.csv",
    url: `${OUR_AIRPORTS_BASE_URL}/airports.csv`,
  },
  runways: {
    key: "runways",
    filename: "runways.csv",
    url: `${OUR_AIRPORTS_BASE_URL}/runways.csv`,
  },
  frequencies: {
    key: "frequencies",
    filename: "airport-frequencies.csv",
    url: `${OUR_AIRPORTS_BASE_URL}/airport-frequencies.csv`,
  },
  navaids: {
    key: "navaids",
    filename: "navaids.csv",
    url: `${OUR_AIRPORTS_BASE_URL}/navaids.csv`,
  },
});
