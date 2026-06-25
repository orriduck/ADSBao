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
export const CHANGELOG_TOTAL_COUNT = 90;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.0",
    kind: "feat",
    title: {
      en: "Designed, not aligned — system pass",
      zh: "为「设计感」而非「对齐」打磨",
    },
    summary: {
      en: "A page-by-page pass applying ADSBao's existing material system with intentional hierarchy, density rhythm, and surface separation. Opens with a typographic foundation: hierarchy now comes from size and luminance, never weight.",
      zh: "逐页打磨，让 ADSBao 既有的材质系统以更有层次、更有节奏、更分面的方式呈现。首先落地排版基线：层次来自字号与明度，而非字重。",
    },
    highlights: [
      {
        en: "Typography is light/regular only — no bold/semibold anywhere; weight utilities and tokens remapped at the source",
        zh: "排版仅用 light/regular，全应用不再有粗体；字重工具类与 token 在源头统一重映射",
      },
      {
        en: "Loaded font weights trimmed to 300/400 for a lighter, more editorial feel",
        zh: "加载的字重收敛为 300/400，整体更轻、更具编排感",
      },
      {
        en: "Nearby list rows share one compact two-line form — callsign + distance over route + altitude — with a subtle climb/descend cue; rich detail stays in the preview card",
        zh: "邻近列表统一为紧凑两行：呼号 + 距离在上、航线 + 高度在下，并带轻量的爬升/下降指示；详细信息只留在预览卡片中",
      },
      {
        en: "Weather splits into a Local view (friendly current conditions + hourly) and a METAR view (flight-rules hero + raw report + decoded grid), switched by a quiet capsule segment",
        zh: "天气拆分为 Local（友好的实时天况 + 逐时预报）与 METAR（飞行规则主指标 + 原始报文 + 解码网格）两个视图，由一个安静的玻璃胶囊分段切换",
      },
      {
        en: "ATC frequencies render as a clean table — role left, channel in mono right-aligned — ordered by operational flow (ATIS → Clearance → Ground → Tower → Approach → Departure)",
        zh: "ATC 频率改为整洁表格：左侧角色、右侧等宽对齐的频道，并按运行流程排序（ATIS → Clearance → Ground → Tower → Approach → Departure）",
      },
      {
        en: "Nearby / weather / ATC stay unified under one quiet hero-stats segment — only one summary surface shows at a time, with a 240ms cross-fade and regular-weight numerals",
        zh: "邻近 / 天气 / ATC 统一在一个安静的主指标分段下切换——同一时刻只显示一个汇总面，配 240ms 交叉淡入与常规字重数字",
      },
    ],
  },
  {
    version: "v2.27.0",
    kind: "feat",
    title: {
      en: "Frosted interface redesign",
      zh: "Frosted 界面重构",
    },
    summary: {
      en: "A whole-app frosted-glass visual system: theme-following chrome, one orange signal accent, a shared first-screen type scale, and consistent airport / aircraft / home / static surfaces.",
      zh: "全应用 Frosted 玻璃视觉系统：跟随主题的界面、统一橙色信号强调色、共享首屏排版梯度，以及一致的机场 / 飞机 / 首页 / 静态页表面。",
    },
    highlights: [
      {
        en: "Chrome follows the theme — white frosted glass + ink in light, deep-gray glass + white in dark",
        zh: "界面跟随主题——亮色白 frosted 玻璃 + 黑字，暗色深灰玻璃 + 白字",
      },
      {
        en: "One orange signal accent for row selection, the tracked-flight trace, and the track button",
        zh: "单一橙色信号色用于行选中、追踪航迹与追踪按钮",
      },
      {
        en: "First-screen pages share one --fs-* type scale; flight telemetry leads with Speed + Altitude",
        zh: "首屏各页共用一套 --fs-* 排版梯度；飞行遥测以速度 + 高度为主指标",
      },
      {
        en: "Nearby list virtualizes on mobile; selected-row value columns stay aligned",
        zh: "邻近列表在移动端虚拟化；选中行的数值列保持对齐",
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
