import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotNavigationLinks,
  resolveSpotNavigationPlatform,
  resolveSpotCoordinates,
} from "./spotNavigationLinks";

test("resolveSpotNavigationPlatform detects native map families", () => {
  assert.equal(resolveSpotNavigationPlatform("Mozilla/5.0 (iPhone)"), "apple");
  assert.equal(resolveSpotNavigationPlatform("Mozilla/5.0 (Macintosh)"), "apple");
  assert.equal(resolveSpotNavigationPlatform("Mozilla/5.0 (Linux; Android 15)"), "android");
  assert.equal(resolveSpotNavigationPlatform("Mozilla/5.0 (X11; Linux x86_64)"), "generic");
});

test("buildSpotNavigationLinks builds Apple and Google directions", () => {
  const links = buildSpotNavigationLinks(
    { lat: 42.3587062, lon: -70.968364, name: "Shirley Beach" },
    { userAgent: "Mozilla/5.0 (Macintosh)" },
  );
  assert.equal(links?.platform, "apple");
  assert.equal(
    links?.nativeMapUrl,
    "https://maps.apple.com/?daddr=42.358706%2C-70.968364&q=Shirley+Beach",
  );
  assert.equal(
    links?.googleMapsUrl,
    "https://www.google.com/maps/dir/?api=1&destination=42.358706%2C-70.968364&travelmode=driving",
  );
});

test("buildSpotNavigationLinks uses geo URLs for Android native maps", () => {
  const links = buildSpotNavigationLinks(
    { lat: 42.3587062, lon: -70.968364, title: "Spot #1" },
    { userAgent: "Android" },
  );
  assert.equal(links?.nativeMapUrl, "geo:42.358706,-70.968364?q=42.358706%2C-70.968364(Spot%20%231)");
});

test("buildSpotNavigationLinks rejects spots without coordinates", () => {
  assert.equal(buildSpotNavigationLinks({ name: "No coordinates" }), null);
});

test("blank and invalid coordinates never become a navigation destination", () => {
  for (const value of [null, undefined, "", "  ", false, Number.NaN, Infinity]) {
    assert.equal(buildSpotNavigationLinks({ lat: value, lon: -71 }), null);
    assert.equal(buildSpotNavigationLinks({ lat: 42, lon: value }), null);
  }
  assert.equal(buildSpotNavigationLinks({ lat: 91, lon: -71 }), null);
  assert.equal(buildSpotNavigationLinks({ lat: 42, lon: -181 }), null);
});

test("real zero coordinates and numeric coordinate strings remain valid", () => {
  assert.deepEqual(resolveSpotCoordinates({ lat: 0, lon: 0 }), { lat: 0, lon: 0 });
  assert.deepEqual(resolveSpotCoordinates({ lat: "42.36", lon: "-71.01" }), { lat: 42.36, lon: -71.01 });
});
