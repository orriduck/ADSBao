// 把实时频道(traffic / callsign / aircraft)推送的 payload 统一规整成
// `{ ac: [...] }` 结构。上游可能直接发数组,也可能发带 `ac` 字段的对象;
// 两种都接受,其余一律退化为空数组。useAircraftPositions 与 useTrackedAircraft
// 之前各自维护了一份等价实现,这里抽成唯一来源(Part D 去重)。
export function normalizeRealtimeAircraftPayload(data: unknown): Record<string, any> {
  if (Array.isArray(data)) return { ac: data };
  if (data && typeof data === "object" && Array.isArray((data as any).ac)) {
    return data as Record<string, any>;
  }
  return { ac: [] };
}
