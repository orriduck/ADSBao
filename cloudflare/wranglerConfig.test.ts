import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type ServiceBinding = {
  binding?: string;
  service?: string;
  remote?: boolean;
};

type WranglerConfig = {
  services?: ServiceBinding[];
  env?: {
    preview?: {
      services?: ServiceBinding[];
    };
  };
};

const config = JSON.parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
) as WranglerConfig;

assert.deepEqual(config.services, [
  {
    binding: "ADSBAO_BACKEND",
    service: "adsbao-backend",
  },
]);
assert.deepEqual(config.env?.preview?.services, [
  {
    binding: "ADSBAO_BACKEND",
    service: "adsbao-backend-preview",
    remote: true,
  },
]);

console.log("cloudflare/wranglerConfig.test.ts ok");
