import { OUR_AIRPORTS_DATASETS } from "./ourAirportsCsvSources";
import { parseCsv } from "./ourAirportsCsvParser";

const defaultFetch = () => globalThis.fetch?.bind(globalThis);

export const downloadAndParseDataset = async (
  dataset,
  { fetchImpl = defaultFetch() } = {},
) => {
  if (!dataset?.url) {
    throw new Error("downloadAndParseDataset requires a dataset with a url");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("downloadAndParseDataset requires a fetch implementation");
  }

  const response = await fetchImpl(dataset.url, {
    headers: { Accept: "text/csv" },
  });

  if (!response.ok) {
    throw new Error(
      `OurAirports download failed for ${dataset.filename} (${response.status})`,
    );
  }

  const text = await response.text();
  const { headers, rows } = parseCsv(text);
  return { dataset, headers, rows };
};

export const downloadAllDatasets = async ({ fetchImpl = defaultFetch() } = {}) => {
  const results = {};
  for (const key of Object.keys(OUR_AIRPORTS_DATASETS)) {
    const dataset = OUR_AIRPORTS_DATASETS[key];
    results[key] = await downloadAndParseDataset(dataset, { fetchImpl });
  }
  return results;
};
