import assert from "node:assert/strict";

import {
  createAdsbaoWebMcpTools,
  registerAdsbaoWebMcpTools,
  type WebMcpModelContext,
} from "./webMcpTools";

const calls: string[] = [];

const runtime = {
  fetch: async (url: RequestInfo | URL) => {
    calls.push(String(url));
    return new Response(
      JSON.stringify({
        source: "openaip",
        airports: [
          {
            ident: "KBOS",
            iata: "BOS",
            name: "Boston Logan International Airport",
            municipality: "Boston",
            isoCountry: "US",
            type: "large_airport",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
  navigate: (path: string) => calls.push(`navigate:${path}`),
  getPageContext: () => ({
    href: "https://adsbao.dev/airport/kbos",
    pathname: "/airport/kbos",
    search: "",
    hash: "",
    title: "KBOS - Boston Logan | ADSBao",
    heading: "Boston Logan",
  }),
};

const tools = createAdsbaoWebMcpTools(runtime);
assert.deepEqual(
  tools.map((tool) => tool.name),
  ["search_airports", "open_airport", "open_aircraft", "get_page_context"],
);

const searchResult = await tools
  .find((tool) => tool.name === "search_airports")
  ?.execute({ query: "Boston", limit: 3 });
assert.equal(calls[0], "/api/search?q=Boston&limit=3");
assert.deepEqual((searchResult?.result as Record<string, any>).airports[0], {
  ident: "KBOS",
  iata: "BOS",
  name: "Boston Logan International Airport",
  municipality: "Boston",
  country: "US",
  type: "large_airport",
});

await tools
  .find((tool) => tool.name === "open_airport")
  ?.execute({ icao: " kbos " });
assert.equal(calls.at(-1), "navigate:/airport/KBOS");

await tools
  .find((tool) => tool.name === "open_aircraft")
  ?.execute({ callsign: " afr331e " });
assert.equal(calls.at(-1), "navigate:/aircraft/AFR331E");

const pageContext = await tools
  .find((tool) => tool.name === "get_page_context")
  ?.execute();
assert.deepEqual((pageContext?.result as Record<string, any>).entity, {
  type: "airport",
  id: "KBOS",
});
assert.equal((pageContext?.result as Record<string, any>).pageKind, "airport");

const registeredTools: string[] = [];
const modelContext: WebMcpModelContext = {
  registerTool(tool) {
    registeredTools.push(tool.name);
  },
};
assert.deepEqual(await registerAdsbaoWebMcpTools(modelContext, runtime), [
  "search_airports",
  "open_airport",
  "open_aircraft",
  "get_page_context",
]);
assert.deepEqual(registeredTools, [
  "search_airports",
  "open_airport",
  "open_aircraft",
  "get_page_context",
]);

console.log("webMcpTools.test.ts ok");
