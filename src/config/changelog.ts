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

export const CHANGELOG_INITIAL_LIMIT = 1;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 72;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.9.13",
    kind: "feat",
    title: {
      en: "Recorded flight trace views",
      zh: "主动记录航迹视图",
    },
    summary: {
      en: "Flight pages now keep the actively recorded trail and destination line visible, add Follow, Full, and Recorded map views, and align mobile sidebar chrome with the page theme. Airspace now loads viewport context on airport pages, uses a fresh cache key so restored boundaries appear immediately, and keeps the selected context record available to its preview card. Aircraft previews now place the mobile photo on the left, keep the desktop type beside the callsign, and reserve the quiet title-corner close control for the header row only. The shared map toolbar now always includes a full-page refresh button; signed-in settings save with the verified account identity, and the metrics, flight search, and filter matrix now share one lightly milky glass treatment with a tighter value scale. The mobile home screen now keeps its first view free of the decorative background. Realtime maps now reject obsolete stream writes, retain an aircraft through a transient missed frame, and atomically replace airspace context tiles.",
      zh: "飞机追踪页现在会持续显示主动记录的航迹与目的地连线，新增跟随、完整航迹和所有记录点三种视图，并让移动端侧栏与页面主题背景保持一致。空域图层现在会在机场页加载视口数据，使用新的缓存键让恢复后的边界立即出现，并把选中的视口空域保留给预览卡。飞机预览卡现在把移动端照片放在左侧、桌面端机型紧随航班号，并让克制的标题角落关闭符号只给标题行预留空间。共享地图工具栏现在始终提供整页刷新按钮；已登录用户的设置会以已验证的账户身份保存；指标卡、航班搜索框与筛选矩阵共享同一层轻微乳白玻璃，筛选值字号也更紧凑。移动端首页首屏现在不再显示装饰背景。实时地图现在会拒绝过期 stream 写入，在单帧缺失时短暂保留飞机，并以原子方式替换空域视口 tile。",
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
