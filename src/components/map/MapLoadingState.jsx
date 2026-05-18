"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function MapLoadingState() {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-atc-card">
      <div className="font-mono text-[11px] tracking-widest text-atc-faint">
        {t("map.loadingMap")}
      </div>
    </div>
  );
}
