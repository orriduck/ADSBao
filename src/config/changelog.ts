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
export const CHANGELOG_TOTAL_COUNT = 65;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.0.0",
    kind: "feat",
    title: {
      en: "Plane Hunter for everyone: one-screen capture studio, no flag",
      zh: "拍机工作室面向所有人:一屏拍照,不再内测",
    },
    summary: {
      en: "The Plane Hunter camera studio graduates from internal testing to everyone. It's a single screen: pick an aircraft, frame it in the live viewfinder with the overlay template rendering as you shoot, follow the compass ribbon up top to line the plane up (it turns green and snaps to centre when aligned), then one tap to capture and share. The two data-driven templates — a boarding-pass Card and a departure-board Brief — ship in Manrope with the design-system signal-orange accent. The old feature gate and the legacy two-step compose flow are both gone: there's now one modern studio for every user, on every supported device.",
      zh: "拍机相机工作室从内测正式面向所有人。整个流程就在一屏:选一架飞机,在实时取景器里取景——模板边拍边实时渲染,跟着顶部的罗盘带把飞机对准(对齐时变绿并归中),一键拍照分享。两个数据驱动的模板——登机牌式 Card 和离港牌式 Brief——都用 Manrope 字体 + 设计系统的信号橙主色。旧的功能开关和旧版两步式编辑流程都已移除:现在所有用户、所有受支持设备上都是同一个 modern 工作室。",
    },
    highlights: [
      {
        en: "The internal feature flag that gated the studio is removed — every user gets the modern one-screen Plane Hunter, with no legacy fallback.",
        zh: "门控工作室的内部 feature flag 已移除——所有用户都进 modern 一屏式拍机,没有旧版回落。",
      },
      {
        en: "Live template overlay on the viewfinder — what you frame is what you save; capture composites the exact capture area and shares it.",
        zh: "取景器上实时套模板——所见即所存;拍照合成的正是取景区并直接分享。",
      },
      {
        en: "Compass ribbon up top: heading tape + degree readout + aircraft marker that points you left/right and turns green when the plane is centred.",
        zh: "顶部罗盘带:航向尺 + 度数读数 + 飞机 marker,指引你左右,飞机居中时变绿。",
      },
      {
        en: "Shutter → Retake / Share, a single tap-to-cycle template button, and full portrait + landscape support.",
        zh: "快门 → 重拍/分享,单个点按循环的模板按钮,横竖屏完整支持。",
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
