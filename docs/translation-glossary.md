# Translation Glossary — English → Simplified Chinese (简体中文)

Use this table as the reference when reviewing Chrome's built-in
auto-translation of ADSBao or when staging a manual zh-CN port. Each
translatable row lists one concrete preferred term — pick that one
and don't substitute. Items under **Do not translate** must keep
their original English/numeric form; the UI marks those elements
with `translate="no"` so Chrome's translator leaves them alone.

## Map controls

| English | zh-CN |
|---|---|
| Approach (zoom preset) | 进近视图 |
| Airport (zoom preset) | 机场视图 |
| Detail (zoom preset) | 详情视图 |
| Fit to trace | 适配轨迹 |
| Scale | 比例尺 |
| Range rings | 距离圈 |
| Map labels | 地图标签 |
| Runway beams | 跑道延长线 |
| Routing points | 航路点 |
| Focus mode | 专注模式 |
| Theme | 主题 |

## Flight tracking

| English | zh-CN |
|---|---|
| Aircraft | 飞机 |
| Callsign | 呼号 |
| Track (verb) | 追踪 |
| Tracking | 追踪中 |
| Lost signal | 信号丢失 |
| Stopped reporting | 停止传输信号 |
| Keep showing current trace | 保持当前轨迹 |
| Try again | 重试 |
| Back to home | 返回首页 |
| Trace | 轨迹 |
| Selected | 已选中 |

## Telemetry

| English | zh-CN |
|---|---|
| Speed | 速度 |
| Altitude | 高度 |
| V/S (Vertical Speed) | 升降率 |
| Heading | 航向 |
| Status | 状态 |
| AIR | 空中 |
| GND | 地面 |
| Type | 机型 |
| Category | 等级 |

## Routes

| English | zh-CN |
|---|---|
| Route | 航线 |
| Departure | 起飞 |
| Arrival | 到达 |
| Unknown | 未知 |
| Origin | 出发地 |
| Destination | 目的地 |

## Airports

| English | zh-CN |
|---|---|
| Airport | 机场 |
| Runway | 跑道 |
| Threshold | 跑道起点 |
| Elevation | 海拔 |
| Distance | 距离 |
| Nearby airports | 附近机场 |

## Weather

| English | zh-CN |
|---|---|
| Weather | 天气 |
| Visibility | 能见度 |
| Ceiling | 云底高 |
| Wind | 风 |
| Temperature | 温度 |
| Dew point | 露点 |
| Altimeter | 高度表 |

## Units

| English | zh-CN |
|---|---|
| NM (nautical mile) | 海里 |
| FT (feet) | 英尺 |
| KT (knots) | 节 |
| FPM (feet per minute) | 英尺/分 |
| DEG (degrees) | 度 |

## Navigation & site

| English | zh-CN |
|---|---|
| Home | 首页 |
| About | 关于 |
| Changelog | 更新日志 |
| Releases | 版本发布 |
| Current (release) | 当前版本 |
| Data sources | 数据源 |
| Version | 版本 |
| Stack | 技术栈 |
| Scope | 范围 |
| Repository | 仓库 |
| Search | 搜索 |
| Featured airports | 推荐机场 |

## Do not translate

These are English-specific identifiers, codes, or proper nouns —
they have no useful Chinese form. The UI marks the corresponding
elements with `translate="no"` (or wraps them in `<NoTranslate>`) so
Chrome's translator skips them.

| Category | Example |
|---|---|
| Callsigns | UAL2394, DAL2895 |
| ICAO airport codes | KJFK, KLAX, EGLL |
| IATA airport codes | JFK, LAX, LHR |
| Country codes | US, GB, JP |
| Aircraft type designators | A320, B738, B77W |
| ICAO24 hex codes | A12B3C |
| Tail registrations | N123AB, G-EUOA |
| Coordinates | 40.6398N, 73.7787W |
| Runway identifiers | 04L, 22R, 31L |
| Frequencies | 118.95, 121.5 |
| Standard abbreviations | ICAO24, METAR, UTC |
| Raw METAR text | KJFK 171151Z 26009KT … |
| ADS-B feed names | adsb.lol, airplanes.live |
| User-Agent strings | ADSBao/1.2.0 |
| Version strings | v1.2.0 |

## Style notes

- Prefer 简体中文 (Mainland) conventions over 繁體中文 (Taiwan/HK) —
  e.g. 机场 not 機場, 跑道 not 飛航 phrasing.
- Keep numeric units adjacent to their value in the original order:
  `9,475 ft` → `9,475 英尺`, not `英尺 9,475`.
- Time format stays 24-hour HH:MM (no localization).
