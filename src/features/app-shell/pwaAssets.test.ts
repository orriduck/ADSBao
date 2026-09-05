import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ADSBAO_PWA_PUBLIC_ASSET_PATHS } from "./pwaCachePolicy";

const root = new URL("../../../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const manifestPath = html.match(/rel="manifest" href="([^"]+)"/)?.[1];
assert.ok(manifestPath);
const asset = (path: string) => readFileSync(new URL("public" + path, root));
const manifest = JSON.parse(asset(manifestPath).toString());
assert.equal(manifest.id, "/", "asset revisions preserve the installed app identity");
for (const path of ADSBAO_PWA_PUBLIC_ASSET_PATHS) {
  const hash = createHash("sha256").update(asset(path)).digest("hex").slice(0, 10);
  assert.ok(path.includes(`.${hash}.`), `${path} must match its content hash`);
}
for (const icon of manifest.icons) {
  assert.ok((ADSBAO_PWA_PUBLIC_ASSET_PATHS as readonly string[]).includes(icon.src));
  const png = asset(icon.src);
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
console.log("pwaAssets.test.ts ok");
