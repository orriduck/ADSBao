import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  CHANGELOG_PAGE_SIZE,
  CHANGELOG_RECENT,
  CHANGELOG_TOTAL_COUNT,
  loadChangelogHistory,
  resolveChangelogText,
  type ChangelogEntry as ProductChangelogEntry,
  type ChangelogLocalizedReleaseCopy,
} from "@/config/changelog";

// Sidebar-scoped changelog. Reuses DitherPageShell so the page reads as
// a sibling of Home and About: same brand block, same footer, same
// dither background. Each release is a compact rail row: version/status on the
// left, release copy on one stable content axis.

export default function ChangelogPanel() {
  const { locale, t } = useI18n();
  const [historyReleases, setHistoryReleases] = useState<
    ProductChangelogEntry[]
  >([]);
  const [historyReleaseCopy, setHistoryReleaseCopy] = useState<
    Record<string, ChangelogLocalizedReleaseCopy>
  >({});
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CHANGELOG_RECENT.length);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const historyRequestRef = useRef<Promise<unknown> | null>(null);
  const visibleReleases = [...CHANGELOG_RECENT, ...historyReleases].slice(
    0,
    visibleCount,
  );
  const hasMoreReleases = visibleCount < CHANGELOG_TOTAL_COUNT;

  const loadNextPage = useCallback(() => {
    const loadedCount = CHANGELOG_RECENT.length + historyReleases.length;
    if (visibleCount < loadedCount) {
      setVisibleCount((current) =>
        Math.min(
          current + CHANGELOG_PAGE_SIZE,
          loadedCount,
          CHANGELOG_TOTAL_COUNT,
        ),
      );
      return;
    }

    if (
      historyLoadFailed ||
      historyReleases.length > 0 ||
      historyRequestRef.current
    ) {
      return;
    }

    const request = loadChangelogHistory()
      .then((history) => {
        setHistoryReleases(history.releases);
        setHistoryReleaseCopy(history.localizedReleaseCopy);
        setVisibleCount((current) =>
          Math.min(
            current + CHANGELOG_PAGE_SIZE,
            CHANGELOG_RECENT.length + history.releases.length,
            CHANGELOG_TOTAL_COUNT,
          ),
        );
      })
      .catch(() => {
        setHistoryLoadFailed(true);
      })
      .finally(() => {
        historyRequestRef.current = null;
      });

    historyRequestRef.current = request;
  }, [historyLoadFailed, historyReleases.length, visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMoreReleases) return;

    if (typeof IntersectionObserver === "undefined") {
      loadNextPage();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadNextPage();
      },
      { root: null, rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreReleases, loadNextPage]);

  return (
    <>
      <div className="dither-section-header flex-none px-5 pt-5 pb-2.5">
        <div className="atc-section-head">
          <span className="atc-kicker">{t("changelog.releases")}</span>
          <span className="atc-section-head__count">
            {t("changelog.total", { count: CHANGELOG_TOTAL_COUNT })}
          </span>
        </div>
      </div>

      <ol className="dither-list dither-list-flow mx-5 mb-5 flex flex-none flex-col gap-1.5">
        {visibleReleases.map((release, index) => (
          <ChangelogEntry
            key={release.version}
            release={release}
            locale={locale}
            isLatest={index === 0}
            localizedCopy={historyReleaseCopy[release.version]}
          />
        ))}
        {hasMoreReleases ? (
          <li ref={sentinelRef} aria-hidden="true" className="h-px" />
        ) : null}
      </ol>
    </>
  );
}

function ChangelogEntry({
  release,
  isLatest,
  locale,
  localizedCopy,
}: {
  release: ProductChangelogEntry;
  isLatest: boolean;
  locale: string;
  localizedCopy?: ChangelogLocalizedReleaseCopy;
}) {
  const { t } = useI18n();
  const localizedRelease = locale === "zh-CN" ? localizedCopy : null;
  const title =
    localizedRelease?.title || resolveChangelogText(release.title, locale);
  const summary =
    localizedRelease?.summary || resolveChangelogText(release.summary, locale);
  const highlights =
    localizedRelease?.highlights ||
    release.highlights.map((item) => resolveChangelogText(item, locale));
  return (
    <li
      className="changelog-entry"
      data-current={isLatest ? "true" : undefined}
    >
      <div className="changelog-entry__rail">
        <span className="changelog-entry__version">{release.version}</span>
        {release.kind ? (
          // Same mono code chip as the ICAO / category chips; one shared style.
          <span className="inline-flex w-fit items-center justify-center whitespace-nowrap rounded-[5px] px-[5px] py-[2.5px] font-code text-[calc(8.5px*var(--sb-body-scale))] [letter-spacing:0.4px] text-atc-dim shadow-[inset_0_0_0_0.5px_var(--atc-line-strong)]">
            {release.kind.toUpperCase()}
          </span>
        ) : null}
        {isLatest && (
          <span className="changelog-entry__current">
            {t("changelog.current")}
          </span>
        )}
      </div>
      <div className="changelog-entry__body">
        {title ? (
          <p className="changelog-entry__title">
            {title}
          </p>
        ) : null}
        {summary ? (
          <p className="changelog-entry__summary">
            {summary}
          </p>
        ) : null}
        {Array.isArray(highlights) && highlights.length > 0 ? (
          <ul className="changelog-entry__highlights">
            {highlights.map((item, index) => (
              <li key={index}>
                <span
                  aria-hidden="true"
                  className="changelog-entry__highlight-index"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
