import assert from "node:assert/strict";
import { formattedNumberSlots, numberSlots } from "./numberSlots";

for (const value of ["09:05", "30.00", "18° / −12°", "10+ SM", "BKN 2,500", "123.450", "1 018 hPa", "١٢:٠٥", "—", "CLR"]) {
  const slots = formattedNumberSlots(value);
  assert.equal(slots.map((slot) => slot.text).join(""), value);
  assert.equal(new Set(slots.map((slot) => slot.key)).size, slots.length);
}

const before = formattedNumberSlots("9° / 12°");
const after = formattedNumberSlots("10° / 12°");
assert.equal(before.find((slot) => slot.text === "9")?.key, after.find((slot) => slot.text === "0")?.key);
assert.deepEqual(before.filter((slot) => slot.key.startsWith("field:1:")), after.filter((slot) => slot.key.startsWith("field:1:")));

const formatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 });
const low = numberSlots(formatter.formatToParts(999.09));
const high = numberSlots(formatter.formatToParts(-1000.10));
assert.equal(low.find((slot) => slot.key === "integer:0")?.text, "9");
assert.equal(high.find((slot) => slot.key === "integer:0")?.text, "0");
assert.equal(high.find((slot) => slot.key === "fraction:0")?.text, "1");
assert.equal(high.map((slot) => slot.text).join(""), "-1,000.10");
console.log("numberSlots.test.ts ok");
