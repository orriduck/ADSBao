import assert from "node:assert/strict";
import {
  LOST_SIGNAL_TOAST_ID,
  buildLostSignalToastOptions,
  resolveLostSignalToastDelayMs,
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

assert.equal(
  resolveLostSignalToastDelayMs({
    active: false,
    hidden: false,
    delayMs: 45_000,
    nowMs: 100_000,
    resumeGraceUntilMs: 0,
  }),
  null,
);

assert.equal(
  resolveLostSignalToastDelayMs({
    active: true,
    hidden: true,
    delayMs: 45_000,
    nowMs: 100_000,
    resumeGraceUntilMs: 0,
  }),
  null,
);

assert.equal(
  resolveLostSignalToastDelayMs({
    active: true,
    hidden: false,
    delayMs: 45_000,
    nowMs: 100_000,
    resumeGraceUntilMs: 0,
  }),
  45_000,
);

assert.equal(
  resolveLostSignalToastDelayMs({
    active: true,
    hidden: false,
    delayMs: 45_000,
    nowMs: 100_000,
    resumeGraceUntilMs: 180_000,
  }),
  80_000,
);

assert.equal(
  resolveLostSignalToastDelayMs({
    active: true,
    hidden: false,
    delayMs: 45_000,
    nowMs: 150_000,
    resumeGraceUntilMs: 180_000,
  }),
  45_000,
);

console.log("lostSignalToastModel.test.ts ok");
