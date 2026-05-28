"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

const THEME_ICONS = {
  monitor: Monitor,
  moon: Moon,
  sun: Sun,
};

export default function ThemeToggle({
  className,
  iconKey = "monitor",
  preference = "system",
  showLabel = false,
  title,
  onClick,
}) {
  const { t } = useI18n();
  const ThemeIcon = THEME_ICONS[iconKey] || Monitor;
  const labelKey =
    preference === "light"
      ? "ui.themeLight"
      : preference === "dark"
        ? "ui.themeDark"
        : "ui.themeSystem";
  const label = t(labelKey);
  const resolvedTitle = title?.startsWith("Theme:")
    ? t("ui.themeTitle", { label })
    : title;

  return (
    <button
      type="button"
      className={className}
      title={resolvedTitle}
      aria-label={resolvedTitle || label}
      onClick={onClick}
    >
      <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}
