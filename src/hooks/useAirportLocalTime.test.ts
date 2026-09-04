import assert from "node:assert/strict";
import { formatAirportLocalTime, formatAirportTimeComparison } from "./useAirportLocalTime";

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

assert.equal(formatAirportTimeComparison(" America/New_York ", "America/Toronto", instant).differenceMinutes, 0);

// Fractional-hour differences keep their direction, including across midnight.
assert.equal(formatAirportTimeComparison("Asia/Kathmandu", "America/Los_Angeles", instant).differenceMinutes, 765);
assert.equal(formatAirportTimeComparison("America/Los_Angeles", "Asia/Kathmandu", instant).differenceMinutes, -765);
assert.equal(formatAirportTimeComparison("America/New_York", "America/Toronto", instant).differenceMinutes, 0);
const midnight = formatAirportTimeComparison("Asia/Tokyo", "America/New_York", new Date("2026-01-01T16:00:00Z"));
assert.equal(midnight.differenceMinutes, 840);
assert.equal(midnight.airport.value, "01:00");
assert.equal(midnight.browser.value, "11:00");
assert.notEqual(midnight.airport.date, midnight.browser.date);

// The same clock comparison changes as a DST boundary is crossed.
assert.equal(formatAirportTimeComparison("America/New_York", "Europe/London", new Date("2026-03-08T06:59:00Z")).differenceMinutes, -300);
assert.equal(formatAirportTimeComparison("America/New_York", "Europe/London", new Date("2026-03-08T07:01:00Z")).differenceMinutes, -240);
for (const zone of ["", "Not/A_Timezone"]) {
  const unknown = formatAirportTimeComparison(zone, "America/New_York", instant);
  assert.equal(unknown.differenceMinutes, null);
  assert.equal(unknown.airport.value, "—");
  assert.equal(unknown.browser.value, "08:34");
}
assert.equal(formatAirportTimeComparison("Asia/Tokyo", "", instant).differenceMinutes, null);
assert.equal(formatAirportTimeComparison("Asia/Tokyo", "America/New_York", new Date(NaN)).differenceMinutes, null);

console.log("useAirportLocalTime.test.ts ok");
