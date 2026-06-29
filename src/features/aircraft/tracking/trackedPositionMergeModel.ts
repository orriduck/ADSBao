import { toFiniteNumber } from "@/utils/math";

// 追踪页双源位置合并。
//
// 详情页主源是 callsign: 通道(上游 /callsign/ 索引),它会间歇性缺一架
// 明明在广播位置的飞机。次源是 aircraft:HEX 通道(上游 /hex/ 索引,按
// ICAO24,稳得多),仅在主源拿不到位置时用来兜底位置——身份/航迹/路由
// 仍由 callsign 源主导。
//
// hex 源是真实 ADS-B 广播位置(真 provider 源),所以不打合成标签:它的
// flight_position_source 经 normalizeAdsbAircraft 会正常解析为 "adsb",
// 源徽章如实显示。只附一个非展示的内部标记 positionVia,便于诊断与测试。

export type TrackedPositionMergeInput = {
  callsignAircraft?: Record<string, any> | null;
  hexFallbackAircraft?: Record<string, any> | null;
};

export type TrackedPositionVia = "callsign" | "hex" | "none";

export type TrackedPositionMergeResult = {
  aircraft: Record<string, any> | null;
  positionVia: TrackedPositionVia;
};

function hasFinitePosition(aircraft: Record<string, any> | null | undefined) {
  return (
    aircraft != null &&
    toFiniteNumber(aircraft.lat) != null &&
    toFiniteNumber(aircraft.lon) != null
  );
}

export function resolveTrackedPositionMerge({
  callsignAircraft = null,
  hexFallbackAircraft = null,
}: TrackedPositionMergeInput = {}): TrackedPositionMergeResult {
  // 主源有可绘位置 → 原样使用(现状不变)。
  if (hasFinitePosition(callsignAircraft)) {
    return { aircraft: callsignAircraft, positionVia: "callsign" };
  }
  // 主源没位置,但 hex 源有 → 用 hex 源的位置兜底。
  if (hasFinitePosition(hexFallbackAircraft)) {
    return {
      aircraft: { ...(hexFallbackAircraft as Record<string, any>), positionVia: "hex" },
      positionVia: "hex",
    };
  }
  // 两源都无位置 → 保留主源(可能带 trackingState 等),无位置即终态。
  return { aircraft: callsignAircraft ?? null, positionVia: "none" };
}
