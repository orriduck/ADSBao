import { RefreshCw } from "lucide-react";
import { useAppVersionUpdate } from "@/components/app-shell/AppVersionUpdateProvider";
import { ToolbarButton } from "@/components/ui/Toolbar";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AppRefreshButton() {
  const { t } = useI18n();
  const { update } = useAppVersionUpdate();
  const label = update
    ? t("appUpdate.refreshAvailable", {
        latestVersion: update.latestVersion,
      })
    : t("map.refreshPage");

  return (
    <ToolbarButton
      tone="rail"
      title={label}
      aria-label={label}
      onClick={() => window.location.reload()}
    >
      <RefreshCw aria-hidden="true" />
      {update ? (
        <span
          aria-hidden="true"
          data-ui="app-update-indicator"
          className="absolute right-1 top-1 z-[2] size-1.5 rounded-full bg-[var(--atc-red)] ring-2 ring-[var(--atc-toolbar-surface)]"
        />
      ) : null}
    </ToolbarButton>
  );
}
