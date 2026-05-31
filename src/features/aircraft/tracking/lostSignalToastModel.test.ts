import assert from "node:assert/strict";
import {
  LOST_SIGNAL_TOAST_ID,
  buildLostSignalToastOptions,
} from "./lostSignalToastModel";

let stayed = false;
let wentHome = false;
const t = (key: string, params: Record<string, any> = {}) => {
  const values = {
    "lostSignal.title": `${params.callsign} stopped reporting`,
    "lostSignal.description": "Keep watching or return home.",
    "lostSignal.acknowledge": "Keep current view",
    "lostSignal.home": "Back to home",
  };
  return values[key] || key;
};

const options = buildLostSignalToastOptions({
  callsign: "aal100",
  t,
  onStay: () => {
    stayed = true;
  },
  onBackHome: () => {
    wentHome = true;
  },
});

assert.equal(LOST_SIGNAL_TOAST_ID, "tracked-flight-lost-signal");
assert.equal(options.id, LOST_SIGNAL_TOAST_ID);
assert.equal(options.title, "AAL100 stopped reporting");
assert.equal(options.description, "Keep watching or return home.");
assert.equal(options.duration, Infinity);
assert.equal(options.closeButton, false);
assert.equal(options.cancel.label, "Keep current view");
assert.equal(options.action.label, "Back to home");

options.cancel.onClick();
options.action.onClick();
assert.equal(stayed, true);
assert.equal(wentHome, true);

console.log("lostSignalToastModel.test.ts ok");
