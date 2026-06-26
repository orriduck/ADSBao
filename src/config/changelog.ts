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
    version: "v2.30.2",
    kind: "patch",
    title: {
      en: "Airport flight-count card — stacked rows + tile transitions",
      zh: "机场航班卡——分行排列与切换动效",
    },
    summary: {
      en: "The airport flight-count card restacks into rows under the count hero: departures / arrivals sit directly beneath the total as its breakdown, then weather / ATC / spotting form the context row. The demoted count keeps more height when another tile is selected, and selecting a tile now plays a designed transition — an accent bar that grows from the tile's centre with a soft spring, plus a tint that fades in — so focus lands on the chosen metric.",
      zh: "机场航班卡改为分行排列:起飞 / 到达直接位于航班总数下方作为进出明细,天气 / ATC / 拍机点构成第三行的上下文。选中其他 tile 时航班数仍保留更舒展的行高;切换 tile 现在带有设计过的过渡——强调条从 tile 中心带轻微回弹地展开,底色淡入,使焦点落到所选指标上。",
    },
    highlights: [
      {
        en: "Flight count, departures/arrivals, and weather/ATC/spotting now stack as three rows instead of one dense strip.",
        zh: "航班数、起飞/到达、天气/ATC/拍机点改为三行堆叠,取代原来的单行密排。",
      },
      {
        en: "Selecting a tile animates an accent bar growing from centre with a soft spring and a fading tint.",
        zh: "选中 tile 时强调条从中心带轻微回弹地展开,并伴随底色淡入。",
      },
    ],
  },
  {
    version: "v2.30.1",
    kind: "patch",
    title: {
      en: "Sidebar typography pass — tokenized sizes, sans headers",
      zh: "侧栏排版微调——字号 token 化、标题改无衬线",
    },
    summary: {
      en: "Every sidebar and dither-panel font size now flows through two scale tokens (titles ×0.8, body ×0.9) so identity names and section headers read tighter while the hierarchy stays fixed. Group headers drop the serif face for the regular sans at a heavier weight, the home airport explorer rail matches the detail sidebar width, and each group gives its first row more breathing room.",
      zh: "所有侧栏与 dither 面板的字号现在统一走两个缩放 token(标题 ×0.8、正文 ×0.9),机场名与区块标题更紧凑,层级比例保持不变。分组标题去掉花体衬线、改用更重字重的常规无衬线;首页机场探索栏宽度与详情页侧栏对齐;每个分组的标题与首项之间留出更多间距。",
    },
    highlights: [
      {
        en: "Two sidebar font-scale tokens (--sb-title-scale / --sb-body-scale) replace ad-hoc px sizes across the airport, aircraft, about, mechanism, and changelog panels.",
        zh: "两个侧栏字号缩放 token(--sb-title-scale / --sb-body-scale)取代散落的 px 字号,覆盖机场、航空器、关于、机制与更新日志面板。",
      },
      {
        en: "Section headers switch from the serif face to the regular sans at a heavier weight.",
        zh: "区块标题由衬线花体改为更重字重的常规无衬线。",
      },
      {
        en: "Home explorer sidebar width aligns with the detail sidebar, and group header-to-first-row spacing is loosened.",
        zh: "首页探索侧栏宽度与详情侧栏对齐,分组标题到首项的间距放宽。",
      },
    ],
  },
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
