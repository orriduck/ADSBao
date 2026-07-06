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
export const CHANGELOG_TOTAL_COUNT = 67;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.2.4",
    kind: "feat",
    title: {
      en: "Aircraft blend into the weather and light",
      zh: "飞机融入天气与光照氛围",
    },
    summary: {
      en: "The aircraft on the map now carry a bit of ambient atmosphere. Their at-rest colour shifts with the current flight-rules weather at that airport — clear, overcast, or low-visibility each read as a subtly different, muted tone (the orange tracked-target and blue clicked-target colours never change, so the one-accent rule holds). Each aircraft also gets a soft highlight/shadow gradient from a simplified light direction that sweeps east to west over the day (not real solar position — a deliberate simplification, not a claim of astronomical accuracy). Both effects are pure lookups and a handful of cached gradient overlays, so drawing hundreds of aircraft at once costs the same as before.",
      zh: "地图上的飞机现在带上了一点环境氛围。它们的静息态颜色会随当前机场的飞行规则天气变化——晴朗、多云或低能见度各自呈现一个略有差异的低饱和度色调(追踪目标的橙色和点选目标的蓝色不受影响,全局单一强调色的规则不变)。每架飞机还会有一层柔和的高光/阴影渐变,来自一个简化的光源方向——沿东西轴随一天时间摆动(不是真实太阳位置计算,是刻意的简化,不追求天文精度)。两个效果都只是查表加几张缓存好的渐变蒙版,同屏渲染几百架飞机的开销和之前完全一样。",
    },
    highlights: [
      {
        en: "Aircraft colour shifts with the airport's current flight-rules category (clear / overcast / low-visibility) — muted, ambient tones that never touch the orange (tracked) or blue (clicked) accent colours.",
        zh: "飞机颜色随机场当前飞行规则(晴朗/多云/低能见度)变化——低饱和度的氛围色调,不影响橙色(追踪目标)与蓝色(点选目标)强调色。",
      },
      {
        en: "A subtle highlight/shadow gradient follows a simplified light direction that sweeps east to west over the day; the highlight side holds steady (with hysteresis) instead of flickering as a plane's heading wobbles near a boundary.",
        zh: "柔和的高光/阴影渐变跟随一个沿东西轴随时间摆动的简化光源方向;高光朝向带滞后判定,不会因航向在边界附近轻微抖动而闪烁。",
      },
      {
        en: "Both effects are cache-friendly by design — mood tints reuse the existing sprite cache, and the light gradient is a handful of pre-baked masks composited on draw, not a new per-aircraft cache dimension.",
        zh: "两个效果都对缓存友好——天气色调复用现有的 sprite 缓存,光照渐变则是几张预先烘焙好的蒙版在绘制时合成,不会给每架飞机新增缓存维度。",
      },
      {
        en: "Here mode's stat row: Nearby and Speed are now equally-weighted primary tiles (matching the tracked-flight sidebar's speed/altitude pair), instead of one large hero over a demoted speed cell.",
        zh: "「我的位置」的指标行:附近和速度现在是同权重的主要 tile(和飞行追踪侧栏的速度/高度那对一致),不再是一个大 hero 压着一个被降级的速度格。",
      },
      {
        en: "Fixed: the weather mood always read as \"clear\" regardless of the real METAR — a wrong property path silently swallowed the flight-rules category. Confirmed live: aircraft now correctly shift tone as conditions change.",
        zh: "修复:天气氛围色调之前恒为「clear」,与真实 METAR 无关——一处属性路径写错,悄悄吞掉了飞行规则类别。已用真实天气变化现场验证修复生效。",
      },
      {
        en: "The ambient tint got a lot more visible, and gained a time-of-day dimension: hue now shifts through the day — warm amber at dawn, neutral at midday, warm amber-red at dusk, cool blue at night — layered with the weather mood (which now sets vividness/dimness instead of hue alone). The first pass was too subtle to read at 20px; this one is a clear, deliberate colour, confirmed visible at real map scale.",
        zh: "氛围色调的辨识度大幅提升,并新增了时间维度:色相随一天时间变化——黎明暖橙、正午中性、黄昏暖橙红、夜晚冷蓝——与天气 mood(现在决定鲜艳度/暗淡度,而不再单独决定色相)有机叠加。第一版在 20px 图标上太细微看不出来;这一版是明确、刻意的颜色,已在真实地图比例下确认可见。",
      },
      {
        en: "Fixed: dawn/dusk's warm amber hues sat right next to the single orange accent reserved for the tracked target — in production this painted every aircraft and label the same orange as the one thing meant to stand out. Replaced with a sky-colour palette (dawn blush, daytime cyan, twilight violet, night blue) that keeps a wide hue gap from the accent in every direction, and dialed back overall vividness to stay ambient rather than loud.",
        zh: "修复:黎明/黄昏的暖橙色调和唯一保留给追踪目标的橙色强调色挨得太近——生产环境里把所有飞机和标签都染成了本该用来突出重点的那个橙色。换成一套天空色调色板(黎明淡粉、白天青色、黄昏紫罗兰、夜晚蓝),在各个方向都和强调色保持足够色相距离,整体饱和度也调低,保持氛围感而不刺眼。",
      },
      {
        en: "The atmosphere now extends past the aircraft to the map itself: a soft colour wash over the base imagery (same sky-colour palette, well clear of the orange accent) so the whole view — not just the tiny glyphs — reads as dawn, day, dusk, or night. It sits below every label, badge, and aircraft, so nothing legible gets tinted.",
        zh: "氛围感现在从飞机延伸到了地图本身:在底图之上叠加一层柔和色调遮罩(同一套天空色板,与橙色强调色保持距离),让整个视野——而不只是飞机小图标——读出黎明、白天、黄昏或夜晚的感觉。这层遮罩位于所有标签、徽标和飞机之下,不会染到任何需要看清的内容。",
      },
      {
        en: "The aircraft's highlight/shadow gradient now also carries time-of-day colour instead of plain white/black — warm gold highlight with a cool violet shadow at dawn/dusk, cool blue-white at night, neutral at midday — so it reads more like real light (golden hour, moonlight) instead of a colourless sheen.",
        zh: "飞机的高光/阴影渐变现在也带上了对应时间的色彩,不再是单纯的黑白——黎明/黄昏是暖金高光配冷紫阴影,夜晚是冷蓝白,正午则保持中性——让光影观感更接近真实光照(黄金时刻、月光),而不是一层无色的浮光。",
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
