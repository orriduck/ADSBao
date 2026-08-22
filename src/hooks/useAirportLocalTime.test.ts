import assert from "node:assert/strict";
import { formatAirportLocalTime } from "./useAirportLocalTime";

const instant = new Date("2026-08-22T12:34:56Z");

assert.deepEqual(formatAirportLocalTime("America/New_York", instant), {
  value: "08:34",
  zone: "UTC−4",
});

assert.deepEqual(
  formatAirportLocalTime(
    "America/New_York",
    new Date("2026-01-22T12:34:56Z"),
  ),
  {
    value: "07:34",
    zone: "UTC−5",
  },
);

assert.deepEqual(formatAirportLocalTime("Asia/Seoul", instant), {
  value: "21:34",
  zone: "UTC+9",
});

assert.deepEqual(formatAirportLocalTime("Asia/Kathmandu", instant), {
  value: "18:19",
  zone: "UTC+5:45",
});

assert.deepEqual(formatAirportLocalTime("Not/A_Timezone", instant), {
  value: "—",
  zone: "",
});
assert.deepEqual(formatAirportLocalTime("", instant), {
  value: "—",
  zone: "",
});

console.log("useAirportLocalTime.test.ts ok");
