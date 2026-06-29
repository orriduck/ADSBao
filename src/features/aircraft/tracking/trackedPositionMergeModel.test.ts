import assert from "node:assert/strict";

import { resolveTrackedPositionMerge } from "./trackedPositionMergeModel";

const callsignWithPos = { icao24: "A1B2C3", callsign: "QTR57H", lat: 25.2, lon: 51.6 };
const callsignNoPos = { icao24: "A1B2C3", callsign: "QTR57H", lat: null, lon: undefined };
const hexWithPos = { icao24: "A1B2C3", callsign: "QTR57H", lat: 25.3, lon: 51.7 };

// callsign 源有位置 → 原样使用,身份/航迹/路由仍以它为准。
{
  const result = resolveTrackedPositionMerge({
    callsignAircraft: callsignWithPos,
    hexFallbackAircraft: hexWithPos,
  });
  assert.equal(result.positionVia, "callsign");
  assert.equal(result.aircraft, callsignWithPos); // 同一引用,无新对象
}

// callsign 源无位置 + hex 源有位置 → 用 hex 兜底,并打内部标记 positionVia。
{
  const result = resolveTrackedPositionMerge({
    callsignAircraft: callsignNoPos,
    hexFallbackAircraft: hexWithPos,
  });
  assert.equal(result.positionVia, "hex");
  assert.equal(result.aircraft?.lat, 25.3);
  assert.equal(result.aircraft?.lon, 51.7);
  assert.equal(result.aircraft?.positionVia, "hex");
}

// callsign 源完全为空(终态前) + hex 源有位置 → 用 hex 兜底。这正是
// 「地图能看到、追踪页说没位置」的偶发场景。
{
  const result = resolveTrackedPositionMerge({
    callsignAircraft: null,
    hexFallbackAircraft: hexWithPos,
  });
  assert.equal(result.positionVia, "hex");
  assert.equal(result.aircraft?.lat, 25.3);
}

// hex 源也无位置(离线被清空) → 保留主源,无位置即终态。
{
  const result = resolveTrackedPositionMerge({
    callsignAircraft: null,
    hexFallbackAircraft: null,
  });
  assert.equal(result.positionVia, "none");
  assert.equal(result.aircraft, null);
}

// 没有 hex 提示时(hexFallbackAircraft 始终为空)行为与今天一致。
{
  const result = resolveTrackedPositionMerge({
    callsignAircraft: callsignWithPos,
  });
  assert.equal(result.positionVia, "callsign");
  assert.equal(result.aircraft, callsignWithPos);
}

console.log("trackedPositionMergeModel.test.ts ok");
