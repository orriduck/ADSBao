import assert from "node:assert/strict";
import { fetchAdsbChannel } from "./adsbClient";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

{
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  try {
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      requestedUrls.push(href);
      if (href.includes("api.adsb.lol")) {
        return jsonResponse({ ac: [] });
      }
      if (href.includes("api.airplanes.live")) {
        return jsonResponse({
          ac: [
            {
              hex: "a50370",
              type: "adsc",
              flight: "DAL58   ",
              lat: 49.05,
              lon: -48.9,
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${href}`);
    }) as typeof fetch;

    const event = await fetchAdsbChannel({
      channel: "callsign:DAL58",
      channelType: "callsign",
      target: {
        kind: "callsign",
        callsign: "DAL58",
      },
      params: {},
    });

    assert.equal(event.type, "aircraft:update");
    assert.equal(event.channel, "callsign:DAL58");
    assert.equal(event.source, "airplanes.live");
    assert.deepEqual(event.data.attempts, [
      "adsb.lol:200",
      "airplanes.live:200",
    ]);
    assert.equal(event.data.ac.length, 1);
    assert.equal(event.data.ac[0].type, "adsc");
    assert.equal(requestedUrls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => jsonResponse({ ac: [] })) as typeof fetch;

    const event = await fetchAdsbChannel({
      channel: "callsign:UNKNOWN",
      channelType: "callsign",
      target: {
        kind: "callsign",
        callsign: "UNKNOWN",
      },
      params: {},
    });

    assert.equal(event.type, "aircraft:update");
    assert.equal(event.source, "adsb.fi");
    assert.deepEqual(event.data.attempts, [
      "adsb.lol:200",
      "airplanes.live:200",
      "adsb.fi:200",
    ]);
    assert.deepEqual(event.data.ac, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log("adsbClient.test.ts ok");
