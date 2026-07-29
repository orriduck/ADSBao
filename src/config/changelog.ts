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
export const CHANGELOG_TOTAL_COUNT = 69;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.3.6",
    kind: "feat",
    title: {
      en: "Airport loading and Plane Hunter framing refinement",
      zh: "机场加载与拍机取景优化",
    },
    summary: {
      en: "Airport maps resolve through a centred signal wave, while Plane Hunter keeps its framing consistent between portrait and landscape capture.",
      zh: "机场地图通过居中的信号波显影;拍机模式现在在竖屏与横屏取景间保持一致的模板尺度。",
    },
    highlights: [
      {
        en: "Replaced the custom canvas spiral with a compact ten-cell wave, centred on the usable map area.",
        zh: "用紧凑的十格对称波替换自定义 canvas 螺旋,并始终以可用地图区域中心为原点。",
      },
      {
        en: "The indicator respects reduced-motion preference and fades with the existing map loading layer once the view is ready.",
        zh: "指示器尊重减少动态效果偏好,并在地图就绪后随原有加载图层淡出。",
      },
      {
        en: "Plane Hunter templates now scale from the photo short edge; native landscape uses a smaller compass ribbon, while template repositioning remains available for portrait-locked shooting.",
        zh: "拍机模板现在按照片短边缩放;真横屏会使用更紧凑的指南针,模板位置调整则保留给锁定竖屏时的横拍场景。",
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
