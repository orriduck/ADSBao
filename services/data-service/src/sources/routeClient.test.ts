import assert from "node:assert/strict";
import { fetchRouteChannel } from "./routeClient";

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    },
  } as Response;
}

{
  const calls: string[] = [];
  const event = await fetchRouteChannel({
    channel: "route:DAL123",
    channelType: "route",
    target: { kind: "route", callsign: "DAL123" },
    params: {},
    waitForTurn: async () => {},
    fetchImpl: async (url: string) => {
      calls.push(url);
      return jsonResponse({
        response: {
          flightroute: {
            callsign: "DAL123",
            callsign_icao: "DAL123",
            airline: { icao: "DAL", iata: "DL", name: "Delta Air Lines" },
            origin: {
              icao_code: "KATL",
              iata_code: "ATL",
              name: "Hartsfield Jackson Atlanta Intl",
              latitude: 33.6367,
              longitude: -84.4281,
            },
            destination: {
              icao_code: "KBOS",
              iata_code: "BOS",
              name: "Boston Logan",
              latitude: 42.3656,
              longitude: -71.0096,
            },
          },
        },
      });
    },
  });

  assert.equal(calls[0], "https://api.adsbdb.com/v0/callsign/DAL123");
  assert.equal(event.type, "route:update");
  assert.equal(event.channel, "route:DAL123");
  assert.equal(event.source, "adsbdb");
  const data = event.data as any;
  assert.equal(data.route.callsign, "DAL123");
  assert.equal(data.route.route.iata, "ATL-BOS");
}

{
  const event = await fetchRouteChannel({
    channel: "route:NOPE123",
    channelType: "route",
    target: { kind: "route", callsign: "NOPE123" },
    params: {},
    waitForTurn: async () => {},
    fetchImpl: async () => jsonResponse({ response: "unknown callsign" }, 404),
  });

  assert.equal(event.type, "route:update");
  const data = event.data as any;
  assert.equal(data.route, null);
}

console.log("routeClient.test.ts ok");
