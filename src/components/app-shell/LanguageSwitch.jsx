"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  nextLocale,
} from "@/features/app-shell/i18n/i18nModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Single-button toggle that flips the locale. Uses lucide's Languages
// icon so it reads the same in EN and zh-CN — no per-locale glyph swap,
// and the icon implies "translate / switch language" universally.
export default function LanguageSwitch({ className = "" }) {
  const { locale, cycle, t } = useI18n();
  const target = nextLocale(locale);
  const targetLabel = LOCALE_LABELS[target] || target;
  const currentLabel = LOCALE_LABELS[locale] || locale;
  const aria = `${t("language.switchAria")} (${currentLabel} → ${targetLabel})`;

  return (
    <Button
      variant="atcIcon"
      size="icon"
      className={`ctrl-btn ctrl-language ${className}`.trim()}
      title={aria}
      aria-label={aria}
      onClick={cycle}
      type="button"
      data-current-locale={locale}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

LanguageSwitch.supportedLocales = SUPPORTED_LOCALES;
