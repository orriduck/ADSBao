import assert from "node:assert/strict";

import {
  SITE_SOCIAL_IMAGE,
  getAbsoluteUrl,
  getSiteUrl,
  getSocialImageUrl,
} from "./site";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

try {
  delete process.env.NEXT_PUBLIC_SITE_URL;

  assert.equal(getSiteUrl().toString(), "https://adsbao.dev/");
  assert.equal(getAbsoluteUrl("/airport/KBOS"), "https://adsbao.dev/airport/KBOS");
  assert.equal(getAbsoluteUrl("opengraph-image"), "https://adsbao.dev/opengraph-image");
  assert.equal(SITE_SOCIAL_IMAGE.path, "/opengraph-image");
  assert.equal(SITE_SOCIAL_IMAGE.type, "image/png");
  assert.equal(SITE_SOCIAL_IMAGE.width, 1200);
  assert.equal(SITE_SOCIAL_IMAGE.height, 630);
  assert.equal(getSocialImageUrl(), "https://adsbao.dev/opengraph-image");

  process.env.NEXT_PUBLIC_SITE_URL = "https://preview.adsbao.dev";
  assert.equal(getSiteUrl().toString(), "https://preview.adsbao.dev/");
  assert.equal(
    getAbsoluteUrl("/airport/KJFK"),
    "https://preview.adsbao.dev/airport/KJFK",
  );
  assert.equal(getSocialImageUrl(), "https://preview.adsbao.dev/opengraph-image");
} finally {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
}

console.log("site.test.ts ok");
