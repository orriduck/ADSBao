"use client";

import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function SidebarBrandMark({ className = "" }) {
  const { locale, t } = useI18n();
  const wordmark = String(locale || "").toLowerCase().startsWith("zh")
    ? t("brand.wordmarkZh")
    : "ADSBao";
  return (
    <div
      className={`mb-[18px] flex min-h-[28px] items-center text-atc-text ${className}`.trim()}
    >
      <Link
        href="/"
        aria-label={t("nav.homePage")}
        title={t("nav.homePage")}
        className="inline-flex items-center rounded-[2px] text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-atc-accent"
      >
        <BrandLogo
          height={28}
          wordmark={wordmark}
          ariaLabel={wordmark}
          className="block h-[28px] w-auto"
          animated
        />
      </Link>
    </div>
  );
}
