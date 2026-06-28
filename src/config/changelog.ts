// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Keep entries terse — the long-form story
// belongs in the PR.
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
export const CHANGELOG_TOTAL_COUNT = 58;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.34.1",
    kind: "feat",
    title: {
      en: "Crisp-line airport night lighting",
      zh: "细线机场夜间灯光",
    },
    summary: {
      en: "The airport runway/taxiway lighting is rebuilt as a performance-safe, crisp-line night system. The old look drew 1,500–2,000 colored point markers per airport; the new one draws a handful of thin SVG lines — white dashed runway edges with amber caution zones at both ends, a faint dashed centerline, white end bars, flashing REIL, and green/blue lit taxiways — with no GPU blur, glow, or dimming layer. Lights render only at the detail zoom and only in dark theme, and the geometry is static so panning and zooming stay smooth. At the medium zoom the runway is drawn as a thin clean bar instead of a thick block.",
      zh: "机场跑道/滑行道灯光重做成一套性能安全的细线夜间系统。旧版每个机场要画 1500–2000 个彩色点 marker;新版只画少量细 SVG 线——白色虚线跑道边灯、两端 amber 警戒段、淡虚线中线、白色端横杠、闪烁 REIL,以及绿/蓝点亮的滑行道——不用任何 GPU 模糊、辉光或压暗层。灯光只在详情 zoom、且暗色主题下渲染,几何是静态的,平移缩放都保持顺滑。中间 zoom 档跑道改为细线而非粗块。",
    },
    highlights: [
      {
        en: "“Edge lights” are a single dashed line, not a row of markers — the cheap trick that keeps the night look without the old point-field cost. Runway edges, centerline, end bars and taxiways are plain themed SVG lines; only the few REIL points animate, on one shared ~1.5 Hz timer that respects reduced-motion.",
        zh: "“边灯”是一条虚线而非一排 marker——既保留夜景观感又免去旧点阵开销的廉价做法。跑道边灯、中线、端杠和滑行道都是普通的主题化 SVG 线;只有少数 REIL 点闪烁,共用一个约 1.5Hz 定时器并遵循 reduced-motion。",
      },
      {
        en: "Zoom-gated to the detail view (nothing built or drawn below it) and dark-theme only; daytime keeps the tan runway/taxiway surfaces. The old per-point FAA model, its canvas renderer, the LOD-band system and ~790 net lines of code are removed.",
        zh: "灯光门控在详情 zoom(以下不构建不绘制)且仅暗色主题;白天保留 tan 色跑道/滑行道铺面。旧的逐点 FAA 模型、其 canvas 渲染器、LOD 分级系统及净约 790 行代码已移除。",
      },
      {
        en: "v2.34.1: airport buildings now show at the detail zoom. The OSM lookup widened from terminals + hangars to all buildings, filtered to inside the aerodrome polygon (aeroway=aerodrome) so surrounding city blocks are excluded, and the runway is drawn as a thin clean bar at the medium zoom.",
        zh: "v2.34.1:机场建筑现在在详情 zoom 显示。OSM 取数从航站楼+机库扩到全部建筑,并过滤到机场边界多边形(aeroway=aerodrome)以内,排除周边城市街区;中间 zoom 档跑道改为细线。",
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
