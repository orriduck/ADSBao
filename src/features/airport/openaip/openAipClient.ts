type OpenAipClientRecord = Record<string, any>;

const DEFAULT_BASE_URL = "https://api.core.openaip.net/api";
const DEFAULT_TIMEOUT_MS = 12_000;

const normalizeParamValue = (value: unknown) => String(value ?? "").trim();

export const buildOpenAipCacheKey = (
  resourceType: string,
  query: OpenAipClientRecord = {},
) => {
  const parts = Object.entries(query)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => {
      const normalizedValue = Array.isArray(value)
        ? value.map(normalizeParamValue).join(",")
        : normalizeParamValue(value);
      return [key, normalizedValue] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);
  return ["openaip", resourceType, ...parts].join(":");
};

const appendParams = (url: URL, params: OpenAipClientRecord = {}) => {
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) url.searchParams.set(key, value.join(","));
      continue;
    }
    url.searchParams.set(key, String(value));
  }
};

async function readJsonResponse(response: Response, label: string) {
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`OpenAIP ${label} response was not JSON`);
  }
  if (!response.ok) {
    throw new Error(`OpenAIP ${label} request failed: HTTP ${response.status}`);
  }
  return payload;
}

const withTimeout = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
};

export function createOpenAipClient({
  apiKey,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: OpenAipClientRecord = {}) {
  const key = normalizeParamValue(apiKey);
  if (!key) return null;
  if (!fetchImpl) throw new Error("OpenAIP client requires fetch support");

  const request = async (path: string, params: OpenAipClientRecord, label: string) => {
    const url = new URL(`${baseUrl}${path}`);
    appendParams(url, params);
    const timeout = withTimeout(timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), {
        headers: {
          accept: "application/json",
          "x-openaip-api-key": key,
        },
        signal: timeout.signal,
      });
      return await readJsonResponse(response, label);
    } finally {
      timeout.clear();
    }
  };

  return {
    listAirports({
      page,
      limit,
      fields,
      pos,
      dist,
      bbox,
      country,
      search,
      id,
      type,
    }: OpenAipClientRecord = {}) {
      return request(
        "/airports",
        {
          page,
          limit,
          fields: Array.isArray(fields) ? fields.join(",") : fields,
          pos,
          dist,
          bbox,
          country,
          search,
          id,
          type,
        },
        "airports",
      );
    },

    getAirport(id: string, { fields }: OpenAipClientRecord = {}) {
      return request(
        `/airports/${encodeURIComponent(id)}`,
        { fields: Array.isArray(fields) ? fields.join(",") : fields },
        "airport detail",
      );
    },

    listNavaids(params: OpenAipClientRecord = {}) {
      return request("/navaids", params, "navaids");
    },

    listAirspaces(params: OpenAipClientRecord = {}) {
      return request("/airspaces", params, "airspaces");
    },

    listReportingPoints(params: OpenAipClientRecord = {}) {
      return request("/reporting-points", params, "reporting points");
    },

    listObstacles(params: OpenAipClientRecord = {}) {
      return request("/obstacles", params, "obstacles");
    },
  };
}

export function createOpenAipClientFromEnv({
  env = process.env,
  fetchImpl,
}: {
  env?: Record<string, string | undefined>;
  fetchImpl?: any;
} = {}) {
  return createOpenAipClient({
    apiKey: env.OPENAIP_API_KEY,
    fetchImpl,
  });
}
