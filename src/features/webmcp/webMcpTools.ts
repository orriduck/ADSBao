type WebMcpContent = {
  type: "text";
  text: string;
};

type WebMcpToolResult = {
  content: WebMcpContent[];
  result?: unknown;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input?: Record<string, unknown>) => Promise<WebMcpToolResult> | WebMcpToolResult;
};

type WebMcpRegisterOptions = {
  signal?: AbortSignal;
};

export type WebMcpModelContext = {
  registerTool: (
    tool: WebMcpTool,
    options?: WebMcpRegisterOptions,
  ) => Promise<void> | void;
};

type WebMcpRuntime = {
  fetch: typeof fetch;
  navigate: (path: string) => void;
  getPageContext: () => {
    href: string;
    pathname: string;
    search: string;
    hash: string;
    title: string;
    heading: string;
  };
};

const airportSearchSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Airport name, ICAO, IATA, city, or free-text search query.",
    },
    country: {
      type: "string",
      description: "Optional 2-letter ISO country code, such as US, CA, or JP.",
    },
    type: {
      type: "string",
      enum: ["all", "large_airport", "medium_airport", "small_airport", "heliport"],
      description: "Optional airport type filter.",
    },
    limit: {
      type: "number",
      minimum: 1,
      maximum: 20,
      description: "Maximum number of airport matches to return.",
    },
  },
  required: ["query"],
};

const airportNavigationSchema = {
  type: "object",
  properties: {
    icao: {
      type: "string",
      description: "ICAO airport identifier, such as KBOS, RJTT, or EGLL.",
    },
  },
  required: ["icao"],
};

const aircraftNavigationSchema = {
  type: "object",
  properties: {
    callsign: {
      type: "string",
      description: "Aircraft callsign to open, such as DAL123 or AFR331E.",
    },
    icao: {
      type: "string",
      description:
        "Optional ICAO24 hex address (6 hex chars) of the aircraft. Improves position reliability when the callsign index lags.",
    },
  },
  required: ["callsign"],
};

const normalizeHexHint = (value: unknown) => {
  const hex = String(value || "").trim().toUpperCase();
  return /^[A-F0-9]{6}$/.test(hex) ? hex : "";
};

const normalizeAirportIdent = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizeCallsign = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const numberInRange = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
};

const toolResult = (text: string, result?: unknown): WebMcpToolResult => ({
  content: [{ type: "text", text }],
  result,
});

const summarizeAirports = (payload: Record<string, unknown>) => {
  const airports = Array.isArray(payload.airports) ? payload.airports : [];
  return airports.map((airport: Record<string, unknown>) => ({
    ident: airport.ident ?? airport.icao ?? "",
    iata: airport.iata ?? "",
    name: airport.name ?? "",
    municipality: airport.municipality ?? airport.city ?? "",
    country: airport.isoCountry ?? airport.country ?? "",
    type: airport.type ?? "",
  }));
};

const pageKindForPathname = (pathname: string) => {
  if (pathname.startsWith("/airport/")) return "airport";
  if (pathname.startsWith("/aircraft/")) return "aircraft";
  if (pathname === "/" || pathname === "/here") return "home";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/changelog")) return "changelog";
  if (pathname.startsWith("/mechanism")) return "mechanism";
  return "unknown";
};

const currentEntityForPathname = (pathname: string) => {
  const [, section, value] = pathname.split("/");
  if ((section === "airport" || section === "aircraft") && value) {
    return {
      type: section,
      id: decodeURIComponent(value).toUpperCase(),
    };
  }
  return null;
};

export function createAdsbaoWebMcpTools(runtime: WebMcpRuntime): WebMcpTool[] {
  return [
    {
      name: "search_airports",
      description:
        "Search ADSBao's airport directory and return concise airport matches with ICAO identifiers for navigation.",
      inputSchema: airportSearchSchema,
      async execute(input = {}) {
        const query = String(input.query || "").trim();
        if (!query) return toolResult("Airport search requires a non-empty query.");

        const limit = numberInRange(input.limit, 8, 1, 20);
        const url = new URL("/api/search", "https://adsbao.local");
        url.searchParams.set("q", query);
        url.searchParams.set("limit", String(limit));

        const country = String(input.country || "").trim().toUpperCase();
        if (country) url.searchParams.set("country", country);

        const type = String(input.type || "").trim();
        if (type && type !== "all") url.searchParams.set("type", type);

        const response = await runtime.fetch(`${url.pathname}${url.search}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          return toolResult(`Airport search failed with HTTP ${response.status}.`);
        }

        const payload = await response.json();
        const airports = summarizeAirports(payload);
        return toolResult(
          airports.length
            ? `Found ${airports.length} airport match${airports.length === 1 ? "" : "es"}.`
            : "No airport matches found.",
          { airports, source: payload.source || "unknown" },
        );
      },
    },
    {
      name: "open_airport",
      description:
        "Navigate the visible ADSBao tab to an airport page by ICAO identifier.",
      inputSchema: airportNavigationSchema,
      execute(input = {}) {
        const icao = normalizeAirportIdent(input.icao);
        if (!icao) return toolResult("Airport navigation requires an ICAO identifier.");
        const path = `/airport/${encodeURIComponent(icao)}`;
        runtime.navigate(path);
        return toolResult(`Opening airport ${icao}.`, { path, icao });
      },
    },
    {
      name: "open_aircraft",
      description:
        "Navigate the visible ADSBao tab to an aircraft tracking page by callsign.",
      inputSchema: aircraftNavigationSchema,
      execute(input = {}) {
        const callsign = normalizeCallsign(input.callsign);
        if (!callsign) return toolResult("Aircraft navigation requires a callsign.");
        const hex = normalizeHexHint(input.icao);
        const path = `/aircraft/${encodeURIComponent(callsign)}${
          hex ? `?icao=${hex}` : ""
        }`;
        runtime.navigate(path);
        return toolResult(`Opening aircraft ${callsign}.`, { path, callsign });
      },
    },
    {
      name: "get_page_context",
      description:
        "Return the current ADSBao page kind, URL, title, heading, and selected airport or aircraft identifier when present.",
      execute() {
        const context = runtime.getPageContext();
        const result = {
          ...context,
          pageKind: pageKindForPathname(context.pathname),
          entity: currentEntityForPathname(context.pathname),
        };
        return toolResult("Current ADSBao page context.", result);
      },
    },
  ];
}

export async function registerAdsbaoWebMcpTools(
  modelContext: WebMcpModelContext,
  runtime: WebMcpRuntime,
  signal?: AbortSignal,
) {
  const tools = createAdsbaoWebMcpTools(runtime);
  await Promise.all(
    tools.map((tool) => modelContext.registerTool(tool, { signal })),
  );
  return tools.map((tool) => tool.name);
}
