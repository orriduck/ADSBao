// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Patch-only followups can be folded into the
// latest representative entry. Keep entries terse — the long-form story belongs
// in the PR.

export type LocalizedText = string | { en: string; zh: string };

export type ChangelogEntry = {
  version: string;
  kind: "feat" | "patch" | "breaking";
  title: LocalizedText;
  summary?: LocalizedText;
  highlights: LocalizedText[];
};

export type ChangelogLocalizedReleaseCopy = {
  title?: string;
  summary?: string;
  highlights?: string[];
};

export type ChangelogHistoryPayload = {
  releases: ChangelogEntry[];
  localizedReleaseCopy: Record<string, ChangelogLocalizedReleaseCopy>;
};

// Resolve a possibly-bilingual changelog field to a single string for the
// active locale. Historical entries store plain strings and pass through
// unchanged; { en, zh } entries pick the language, falling back to English.
export function resolveChangelogText(
  value: LocalizedText | undefined,
  locale: string,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return locale === "zh-CN" ? value.zh : value.en;
}

export const CHANGELOG_INITIAL_LIMIT = 1;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 101;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.30.0",
    kind: "feat",
    title: {
      en: "Airport weather redesign — METAR + Local views",
      zh: "机场天气改版——METAR 与实况两视图",
    },
    summary: {
      en: "The airport weather state is rebuilt around one colour-encoded hero card per view over a quiet decoded metric area, switched by a neutral METAR / Local segmented control. METAR leads with a flight-rules hero whose rail, tint, and value are keyed to the category (VFR mint, MVFR blue, IFR red, LIFR magenta) above a decoded aviation grid, the raw report, and a ceiling/visibility read. Local leads with a temperature hero whose colour is mapped onto the temperature itself (teal → amber → orange) above an everyday-units grid — now including UV index and visibility — a next-hours strip, and a plain-language summary.",
      zh: "机场天气状态重做:每个视图以一张颜色编码的主卡片领衔,下方是安静的解码参数区,由中性的 METAR / 实况分段控件切换。METAR 以飞行规则主卡片开场,其左栏、底色与数值都按类别着色(VFR 薄荷绿、MVFR 蓝、IFR 红、LIFR 品红),其下是解码后的航空参数网格、原始报文与云底/能见度读数。实况以温度主卡片开场,颜色随温度本身映射(青→琥珀→橙),其下是日常单位网格(新增紫外线与能见度)、未来数小时与白话总结。",
    },
    highlights: [
      {
        en: "METAR flight-rules hero card colour-coded by category, over a decoded aviation grid (wind / vis / ceiling / temp-dew / altimeter / humidity), the raw report, and a ceiling-visibility interpretation",
        zh: "METAR 飞行规则主卡片按类别着色,下接解码航空网格(风 / 能见度 / 云底 / 温度露点 / 高度表 / 湿度)、原始报文与云底-能见度解读",
      },
      {
        en: "Local temperature hero card whose colour maps onto the temperature, over an everyday-units grid, a next-hours forecast strip, and a plain-language summary",
        zh: "实况温度主卡片颜色随温度映射,下接日常单位网格、未来数小时预报条与白话总结",
      },
      {
        en: "Neutral raised-chip segmented control switches METAR / Local; the airport header and Flights tab stay above",
        zh: "中性凸起胶囊分段控件切换 METAR / 实况;机场标识与航班标签保留在上方",
      },
      {
        en: "Open-Meteo now also fetches UV index and visibility for the Local view",
        zh: "Open-Meteo 现在还为实况视图获取紫外线指数与能见度",
      },
    ],
  },
];

export const ADSBAO_LATEST_CHANGELOG_VERSION =
  CHANGELOG_RECENT[0]?.version || "v0.0.0";

export async function loadChangelogHistory(): Promise<ChangelogHistoryPayload> {
  const history = await import("./changelogHistory");
  return {
    releases: history.CHANGELOG_HISTORY,
    localizedReleaseCopy: history.CHANGELOG_HISTORY_ZH_COPY,
  };
}
