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
    version: "v3.13.31",
    kind: "feat",
    title: {
      en: "Complete wayfinding workspace",
      zh: "完整导视化工作区",
    },
    summary: {
      en: "Airport, flight, and first-screen views now share a continuous 36px wayfinding rail with clearer hierarchy, aligned metrics, stable cached traffic, and cleaner desktop and mobile previews. Toolbars use the circular dumpling-radio mark; aircraft photos and navaid labels scan more easily; and Home, About, Mechanism, and Changelog keep content fixed while only rail glyphs animate.",
      zh: "机场、航班与首屏现统一采用连续 36px 导视边，并整理指标、缓存流量、桌面与移动端预览及导航台信息层级。工具栏启用圆形团子对讲机标志；Home、About、机制与更新日志保持正文静止，只让 rail 内图标、代码与状态标记独立微动。",
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
