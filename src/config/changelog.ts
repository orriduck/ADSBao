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

export const CHANGELOG_INITIAL_LIMIT = 6;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 91;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.26.19",
    kind: "patch",
    title: {
      en: "Changelog release rails",
      zh: "更新日志 release rail",
    },
    summary: {
      en: "The changelog now reads as compact release rails with one stable copy axis instead of pill-led blocks.",
      zh: "更新日志现在使用紧凑 release rail 和稳定文案轴，不再由 pill 块主导。",
    },
    highlights: [
      {
        en: "Version and current-state markers move into a narrow mono rail",
        zh: "版本号和当前状态标记移入窄 mono rail",
      },
      {
        en: "Titles, summaries, and highlights share one aligned content column on desktop and mobile",
        zh: "标题、摘要和要点在桌面端与移动端共用同一条内容列",
      },
      {
        en: "Rows are denser, so more release history fits in the first viewport without changing loading behavior",
        zh: "条目更紧凑，首屏能显示更多发布历史，同时不改变加载行为",
      },
    ],
  },
  {
    version: "v2.26.18",
    kind: "patch",
    title: {
      en: "Sharper home and here rails",
      zh: "首页与 Here rail 精修",
    },
    summary: {
      en: "The home airport list and /here permission state now use tighter aligned rails instead of heavier standalone blocks.",
      zh: "首页机场列表和 /here 权限态现在使用更紧凑的对齐 rail，不再依赖厚重的独立块。",
    },
    highlights: [
      {
        en: "Home airport codes become a quiet mono rail aligned with the search icon",
        zh: "首页机场代码改为安静的 mono rail，并与搜索图标对齐",
      },
      {
        en: "Section titles, descriptions, airport names, and search text now share one stable content axis",
        zh: "分组标题、说明、机场名和搜索文字现在共用同一条稳定内容轴",
      },
      {
        en: "The /here denied and unavailable states move into a compact split workspace without changing location behavior",
        zh: "/here 拒绝和不可用状态进入紧凑分栏工作区，不改变定位行为",
      },
    ],
  },
  {
    version: "v2.26.17",
    kind: "patch",
    title: {
      en: "Quieter about source rails",
      zh: "关于页来源 rail 降噪",
    },
    summary: {
      en: "The about page data-source list now reads as aligned source rails instead of repeated badge rows.",
      zh: "关于页数据来源列表现在以对齐 source rail 阅读，不再依赖重复的 badge 行。",
    },
    highlights: [
      {
        en: "Source type labels now sit in a fixed mono rail without filled mini badges",
        zh: "来源类型标签现在位于固定 mono rail，不再使用填充小 badge",
      },
      {
        en: "Provider names and descriptions keep one stable text axis on desktop and mobile",
        zh: "供应方名称和说明在桌面端与移动端保持同一条稳定文字轴",
      },
      {
        en: "External-link affordance remains, but the arrow is smaller and quieter",
        zh: "外部链接提示仍然保留，但箭头更小、更安静",
      },
    ],
  },
  {
    version: "v2.26.16",
    kind: "patch",
    title: {
      en: "Tighter home list rails",
      zh: "首页列表 rail 精修",
    },
    summary: {
      en: "Home airport sections now share the same text axis as the search input and airport row names.",
      zh: "首页机场分组现在与搜索输入文字和机场行名称共用同一条文字轴。",
    },
    highlights: [
      {
        en: "Section headings and descriptions move onto the airport-name rail instead of starting in the code column",
        zh: "分组标题和说明移到机场名 rail，不再从代码列起始",
      },
      {
        en: "Desktop airport code tags gain a little width without moving the airport-name axis",
        zh: "桌面端机场代码标签略微加宽，同时不移动机场名对齐轴",
      },
      {
        en: "Changelog highlight rows now use a quiet number rail instead of dot bullets",
        zh: "更新日志摘要行现在使用更安静的数字 rail，不再使用圆点符号",
      },
    ],
  },
  {
    version: "v2.26.15",
    kind: "patch",
    title: {
      en: "Quieter mechanism rows",
      zh: "机制页展开行降噪",
    },
    summary: {
      en: "The mechanism page now treats expanded rows as inline explanation instead of full selected cards.",
      zh: "机制页现在把展开行处理成内联说明，而不是整块选中卡片。",
    },
    highlights: [
      {
        en: "Expanded mechanism rows no longer use the full glass capsule, shadow, or backdrop blur",
        zh: "展开的机制行不再使用完整玻璃 capsule、阴影或背景模糊",
      },
      {
        en: "The row order is carried by the number rail and text alignment while the default glass active state remains available elsewhere",
        zh: "行秩序由数字 rail 和文字对齐承担，同时其他位置仍可使用默认玻璃选中态",
      },
      {
        en: "This is display-only and leaves the accordion behavior and mechanism copy unchanged",
        zh: "这次仅调整展示，不改变折叠行为和机制页文案",
      },
    ],
  },
  {
    version: "v2.26.14",
    kind: "patch",
    title: {
      en: "Linear map settings controls",
      zh: "地图设置控件线性化",
    },
    summary: {
      en: "Map settings now use lighter inline rows and compact unit controls so the panel reads by alignment instead of heavy capsules.",
      zh: "地图设置现在使用更轻的内联行和紧凑单位控件，让面板主要依靠对齐而不是厚重胶囊建立秩序。",
    },
    highlights: [
      {
        en: "The active base-map row uses a quiet marker instead of a large glass highlight",
        zh: "选中的底图行改用安静的行内标记，不再使用大块玻璃高光",
      },
      {
        en: "Layer switches and unit selectors are smaller, flatter, and keep the same interaction behavior",
        zh: "图层开关和单位选择器更小、更平，并保持原有交互行为",
      },
      {
        en: "Settings persistence copy now separates by placement and weight instead of a hard divider line",
        zh: "设置保存提示现在依靠位置和字重区分，不再使用硬分隔线",
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
