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
export const CHANGELOG_TOTAL_COUNT = 95;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.26.23",
    kind: "patch",
    title: {
      en: "Quieter traffic controls",
      zh: "航班控件降噪",
    },
    summary: {
      en: "The airport traffic sidebar now relies more on aligned rails and less on boxed control surfaces.",
      zh: "机场航班侧栏现在更多依靠对齐 rail 建立秩序，减少成块控件表面。",
    },
    highlights: [
      {
        en: "Metric and filter controls no longer read as a boxed table in the map sidebar",
        zh: "地图侧栏里的指标和筛选控件不再像一个外框表格",
      },
      {
        en: "The traffic search field is quieter and embedded into the control rail",
        zh: "航班搜索框更安静，并嵌入控件 rail",
      },
      {
        en: "Selected filters keep their state without the heavier glass shadow",
        zh: "选中的筛选项保留状态提示，但不再使用较重的玻璃阴影",
      },
    ],
  },
  {
    version: "v2.26.22",
    kind: "patch",
    title: {
      en: "Compact interface rails",
      zh: "界面 rail 压缩",
    },
    summary: {
      en: "Home airport lists and map settings now use tighter aligned rails with quieter surfaces.",
      zh: "首页机场列表和地图设置现在使用更紧凑的对齐 rail 与更安静的表面。",
    },
    highlights: [
      {
        en: "Home search, section labels, airport codes, and airport names now share exact rail coordinates",
        zh: "首页搜索、分组标题、机场代码和机场名现在使用精确一致的 rail 坐标",
      },
      {
        en: "Settings rows are shorter while preserving the same controls and labels",
        zh: "设置行更短，同时保留原有控件和标签",
      },
      {
        en: "The active base-map option now relies on the right rail marker instead of a filled row",
        zh: "选中的底图选项现在依靠右侧 rail 标记，不再使用整行填充",
      },
    ],
  },
  {
    version: "v2.26.21",
    kind: "patch",
    title: {
      en: "Mechanism inline rails",
      zh: "机制页内联 rail",
    },
    summary: {
      en: "The mechanism page now uses one compact number rail for rows, flow labels, and expanded detail copy.",
      zh: "机制页现在用一条紧凑编号 rail 组织行、流程标签和展开说明。",
    },
    highlights: [
      {
        en: "Mechanism row numbers are quiet rail labels instead of filled code capsules",
        zh: "机制行编号改为安静 rail 标签，不再是填充 code capsule",
      },
      {
        en: "Expanded flow labels and detail notes now read inline on the same content axis",
        zh: "展开后的流程标签和说明现在沿同一条内容轴内联阅读",
      },
      {
        en: "The accordion behavior and mechanism copy are unchanged",
        zh: "折叠行为和机制页文案保持不变",
      },
    ],
  },
  {
    version: "v2.26.20",
    kind: "patch",
    title: {
      en: "Home and about rails",
      zh: "首页与关于页 rail",
    },
    summary: {
      en: "Home airport lists and about-page metadata now share quieter rail alignment with less visual chrome.",
      zh: "首页机场列表和关于页元信息现在共用更安静的 rail 对齐，并减少视觉 chrome。",
    },
    highlights: [
      {
        en: "Home discovery and search-result airport rows now keep code, title, and header axes aligned",
        zh: "首页发现列表与搜索结果机场行现在保持 code、标题和表头轴线一致",
      },
      {
        en: "Version, stack, and architecture rows now share one label rail and one content axis",
        zh: "版本、技术栈和架构行现在共用同一条标签 rail 与内容轴",
      },
      {
        en: "The oversized version readout is replaced by compact inline metadata",
        zh: "大号版本读数改为紧凑的行内元信息",
      },
    ],
  },
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
