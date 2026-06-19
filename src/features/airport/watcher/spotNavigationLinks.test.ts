import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotNavigationLinks,
  resolveSpotNavigationPlatform,
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
