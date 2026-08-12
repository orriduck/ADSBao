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
export const CHANGELOG_TOTAL_COUNT = 73;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.12.3",
    kind: "feat",
    title: {
      en: "Operational wayfinding",
      zh: "导视化追踪界面",
    },
    summary: {
      en: "Airport, flight, and first-screen sidebars now share a concise 36px-rail wayfinding system across live content, loading states, directories, filters, previews, Studio, and product information.",
      zh: "机场、航班与首屏侧栏现统一采用 36px 导视色轨，覆盖实时内容、加载状态、目录、筛选、预览、拍机 Studio 与产品信息。",
    },
    highlights: [],
  },
  {
    version: "v3.10.28",
    kind: "feat",
    title: {
      en: "Stable tracking and map preferences",
      zh: "稳定追踪与地图偏好",
    },
    summary: {
      en: "Flight tracking now rejects stale position frames, preserves a coherent live trace through brief feed gaps, and keeps map preferences on this device.",
      zh: "航班追踪现会拒绝过期定位帧，在短暂数据中断时保持连续航迹，并将地图偏好保存在本机。",
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
