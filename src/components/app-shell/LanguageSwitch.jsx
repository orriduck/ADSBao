"use client";

import { Button } from "@/components/ui/button.jsx";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  nextLocale,
} from "@/features/app-shell/i18n/i18nModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Single-button toggle that flips the locale and labels itself with the
// locale we'd switch *to* — so users can predict the action without
// opening a menu. Stays consistent with the icon-button rail visually.
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
      <span className="ctrl-language__label notranslate" translate="no">
        {targetLabel}
      </span>
    </Button>
  );
}

LanguageSwitch.supportedLocales = SUPPORTED_LOCALES;
