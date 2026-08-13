// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking") and one concise user-facing summary. Keep
// detailed implementation notes in the PR, not the product UI.
//
// ONE ENTRY PER MINOR. Don't add a new entry for every patch. Fold each patch
// into the current minor's single rolling entry (update its `summary` and bump
// its `version` to the new patch number, e.g. v2.30.16 -> v2.30.17). The
// `version` keeps a patch digit ON PURPOSE: it must match `package.json` so the
// AppUpdateToast's semver compare still fires on every release. Start a fresh
// entry only when the minor digit changes (a real feature / milestone).

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

export const CHANGELOG_INITIAL_LIMIT = 2;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 74;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.13.25",
    kind: "feat",
    title: {
      en: "Complete wayfinding workspace",
      zh: "完整导视化工作区",
    },
    summary: {
      en: "Airport, flight, and first-screen views share one 36px-rail system with clear hierarchy, reserved tracking color, pictographic source rails, aligned metric baselines, and neutral live vertical-state signs with accessible direction labels. Airport traffic now also keeps usable cached SSE data visible while a source recovers. Directory rows lead with their IATA code in the rail; the first screen now folds category labels into the first destination row for a flatter directory, preview cards share one soft radius and a visible neutral identity rail on desktop and mobile, the mobile toolbar lifts with a faint shadow, and the loading animation stays centered in the map area. Directory and search-result rails now run continuous with no gaps or dividers breaking the rail column. Full-screen mobile detail panels no longer frame the logo dock with a desktop-only side seam, the near-me rail joins the surrounding wayfinding column squarely, and About and Mechanism fold group headings into flatter continuous lists. Mobile tracking overlays now leave the logo dock unframed and remeasure their virtual traffic list after header changes, so aircraft rows stay joined to the filters. Map settings now read as one rail-aligned control surface, with every rail icon placed on the shared 10px / 11px wayfinding offset. Plane Hunter now uses the same full-width rail header in capture and review, keeps the shutter circular, and reserves orange for Share. The app wordmark now leads every global toolbar in a compact 18px mark, and sidebars begin directly with their page identity rather than a separate logo row or scroll-to-collapse gesture.",
      zh: "机场、航班与首屏统一采用 36px 导视边，以清晰层级、克制的追踪色、图形化数据来源边栏、对齐的指标基线与中性实时升降标识（含无障碍方向标注）提升扫读效率；机场流量源恢复期间也会继续显示可用的 SSE 缓存航迹。目录行现以 IATA 代码领衔；首屏将分类标签收进每组首个目的地行，目录层级更平，所有预览卡在桌面和移动端共用同一柔和圆角及可见的中性身份 rail，移动端工具栏以淡阴影浮起，加载动画固定居中于地图区。目录与搜索结果行的 rail 现连续贯通，不再有间隙或分隔线切断 rail 列。全屏移动端详情面板不再以桌面专用的侧边线框住 logo 顶栏，Near me rail 也改为直角衔接周围导视列；About 与机制页都将组标题收进更平的连续列表。移动端追踪 overlay 现不再给 logo 栏加框，并会在上方标题变化后重新量测虚拟列表，飞机行会紧接筛选器显示。地图设置现为一张 rail 对齐的连续控制表面，所有 rail 图标均回到 10px / 11px 的共享导视定位。Plane Hunter 现让取景与处理页共用整宽 rail 顶栏，快门保持圆形，并只将橙色留给 Share。应用文字 logo 现以更紧凑的 18px 标记位于每个全局工具栏的最左端；侧栏则直接从页面身份信息开始，不再保留独立 logo 行或滚动收起手势。",
    },
    highlights: [],
  },
  {
    version: "v3.12.4",
    kind: "feat",
    title: {
      en: "Operational wayfinding",
      zh: "导视化追踪界面",
    },
    summary: {
      en: "Airport, flight, and first-screen sidebars adopt a concise joined-sign hierarchy with clearer metrics, filters, and aircraft lists.",
      zh: "机场、航班与首屏侧栏采用简洁的连体导视层级，并提升指标、筛选器与飞机列表的扫读效率。",
    },
    highlights: [],
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
