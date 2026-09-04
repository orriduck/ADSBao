import { Plane } from "lucide-react";
import { MapLoadingFallback } from "@/components/map/MapLoadingOverlay";
import SidebarShell from "@/components/sidebar/SidebarShell";
import {
  SidebarLoadingContent,
  SidebarLoadingHeader,
} from "@/components/sidebar/SidebarLoadingSkeleton";
import { AviationLoadingState } from "@/components/loading/AviationLoadingState";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const ignoreRouteLoadingNavigation = () => undefined;

export default function RouteLoadingState({ failed = false }: { failed?: boolean }) {
  const { t } = useI18n();
  const location = useLocation();
  const workspaceVariant = location.pathname.startsWith("/aircraft/")
    ? "flight"
    : location.pathname.startsWith("/airport/")
      ? "airport"
      : null;

  if (!failed && workspaceVariant) {
    return (
      <main className="airport-map-kit app-route-loading-workspace bg-atc-bg text-atc-text" role="status">
        <aside className="app-route-loading-workspace__sidebar hidden md:block">
          <SidebarShell
            variant={workspaceVariant}
            onBack={ignoreRouteLoadingNavigation}
            header={<SidebarLoadingHeader variant={workspaceVariant} />}
          >
            <SidebarLoadingContent />
          </SidebarShell>
        </aside>
        <section className="app-route-loading-workspace__main">
          <MapLoadingFallback variant={workspaceVariant} />
        </section>
      </main>
    );
  }

  if (!failed) {
    return (
      <AviationLoadingState
        ariaLabel={t("map.pageLoadingTitle")}
        label={t("map.pageLoadingTitle")}
      />
    );
  }

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-atc-bg px-6 text-atc-text"
      role="alert"
    >
      <div className="app-status-card app-status-card--error">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-atc-dim">
          <Plane className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("map.pageLoadingEyebrow")}</span>
        </div>
        <div className="text-[15px] font-medium leading-snug text-atc-text">
          {t("map.pageLoadFailedTitle")}
        </div>
        <div className="text-[12px] leading-snug text-atc-dim">
          {t("map.routeLoadFailedHint")}
        </div>
        <button
          className="soft-button mt-1"
          onClick={() => window.location.reload()}
          type="button"
        >
          {t("map.routeLoadRetry")}
        </button>
      </div>
    </main>
  );
}

