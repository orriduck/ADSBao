import assert from "node:assert/strict";
import { DataServiceMetrics } from "../metrics/MetricsRegistry";
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

function textResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body;
    },
  } as Response;
}

{
  const calls: string[] = [];
  const metrics = new DataServiceMetrics();
  const event = await fetchRouteChannel({
    channel: "route:DAL123",
    channelType: "route",
    metrics,
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
  const output = metrics.render({ uptimeSec: 1, channels: [] });
  assert.match(
    output,
    /adsbao_external_requests_total\{endpoint="route",provider="adsbdb",result="success",status="200",status_class="2xx"\} 1/,
  );
}

{
  const calls: string[] = [];
  const metrics = new DataServiceMetrics();
  const event = await fetchRouteChannel({
    channel: "route:AAL1234:airport:KBOS",
    channelType: "route",
    metrics,
    target: {
      kind: "route",
      callsign: "AAL1234",
      context: { type: "airport", icao: "KBOS" },
      provider: "flightaware",
    },
    params: { routeProvider: "flightaware" },
    waitForTurn: async () => {},
    fetchImpl: async (url: string) => {
      calls.push(url);
      return textResponse(`
        <html>
          <head>
            <title>AA1234 (AAL1234) American Airlines Flight Tracking</title>
            <meta name="origin" content="KBOS">
            <meta name="destination" content="KLAX">
            <meta name="airline" content="AAL">
            <meta name="description" content="Track American Airlines (AA) #1234">
          </head>
          <body>
            <script>
              var trackpollBootstrap = {"flights":{"AAL1234":{
                "origin":{"icao":"KBOS","iata":"BOS","coord":[-71.0096,42.3656],"friendlyName":"Boston Logan","friendlyLocation":"Boston, MA"},
                "destination":{"icao":"KLAX","iata":"LAX","coord":[-118.4085,33.9416],"friendlyName":"Los Angeles Intl","friendlyLocation":"Los Angeles, CA"}
              }}};
            </script>
          </body>
        </html>
      `);
    },
  });

  assert.equal(calls[0], "https://www.flightaware.com/live/flight/AAL1234");
  assert.equal(event.type, "route:update");
  assert.equal(event.channel, "route:AAL1234:airport:KBOS");
  assert.equal(event.source, "flightaware");
  const data = event.data as any;
  assert.equal(data.route.callsign, "AAL1234");
  assert.equal(data.route.route.iata, "BOS-LAX");
  assert.equal(data.route.source, "flightaware");
  const output = metrics.render({ uptimeSec: 1, channels: [] });
  assert.match(
    output,
    /adsbao_external_requests_total\{endpoint="route",provider="flightaware",result="success",status="200",status_class="2xx"\} 1/,
  );
}

{
  const metrics = new DataServiceMetrics();
  const event = await fetchRouteChannel({
    channel: "route:NOPE123",
    channelType: "route",
    metrics,
    target: { kind: "route", callsign: "NOPE123" },
    params: {},
    waitForTurn: async () => {},
    fetchImpl: async () => jsonResponse({ response: "unknown callsign" }, 404),
  });

  assert.equal(event.type, "route:update");
  const data = event.data as any;
  assert.equal(data.route, null);
  const output = metrics.render({ uptimeSec: 1, channels: [] });
  assert.match(
    output,
    /adsbao_external_requests_total\{endpoint="route",provider="adsbdb",result="success",status="404",status_class="4xx"\} 1/,
  );
}

console.log("routeClient.test.ts ok");
