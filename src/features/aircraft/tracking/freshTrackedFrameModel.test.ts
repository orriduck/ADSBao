import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { shouldAcceptTrackedPositionFrame } from "./freshTrackedFrameModel";

describe("shouldAcceptTrackedPositionFrame", () => {
  it("rejects stale frames even when they contain coordinates", () => {
    assert.equal(
      shouldAcceptTrackedPositionFrame({
        stale: true,
        previousPositionTime: 10_000,
        incomingPositionTime: 20_000,
      }),
      false,
    );
  });

  it("rejects an out-of-order position instead of pulling the marker back", () => {
    assert.equal(
      shouldAcceptTrackedPositionFrame({
        previousPositionTime: 20_000,
        incomingPositionTime: 19_000,
      }),
      false,
    );
  });

  it("accepts the first frame and later monotonic frames", () => {
    assert.equal(
      shouldAcceptTrackedPositionFrame({ incomingPositionTime: 10_000 }),
      true,
    );
    assert.equal(
      shouldAcceptTrackedPositionFrame({
        previousPositionTime: 10_000,
        incomingPositionTime: 10_000,
      }),
      true,
    );
  });
});
