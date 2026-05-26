import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const testDir = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(
  resolve(testDir, "../../../hooks/useAircraftTrace.js"),
  "utf8",
);

assert.equal(
  hookSource.includes('from "sonner"') || hookSource.includes("from 'sonner'"),
  false,
);
assert.equal(
  hookSource.includes("toast.promise") || hookSource.includes("toast.loading"),
  false,
);

console.log("aircraftTraceNotificationContract.test.js ok");
