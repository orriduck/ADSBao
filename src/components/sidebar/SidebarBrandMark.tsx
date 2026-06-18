import { Link, useSearchParams } from "react-router-dom";
import BrandLogo from "@/components/brand/BrandLogo";
import { setHomeSearchParamCarryover } from "@/features/app-shell/navigationModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

export default function SidebarBrandMark({ className = "", compact = false }) {
  const { locale, t } = useI18n();
  const [searchParams] = useSearchParams();
  const homeHref = setHomeSearchParamCarryover(searchParams as any);
  const wordmark = String(locale || "").toLowerCase().startsWith("zh")
    ? t("brand.wordmarkZh")
    : "ADSBao";
  const logoHeight = compact ? 22 : 28;

  return (
    <div
      className={cn(
        "flex items-center text-atc-text transition-[min-height] duration-200 ease-out",
        compact ? "min-h-[24px]" : "min-h-[28px]",
        className,
      )}
    >
      <Link
        to={homeHref}
        aria-label={t("nav.homePage")}
        title={t("nav.homePage")}
        className="inline-flex items-center rounded-[2px] text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-atc-accent"
      >
        <BrandLogo
          height={logoHeight}
          wordmark={wordmark}
          ariaLabel={wordmark}
          className={cn(
            "block w-auto transition-[height] duration-200 ease-out",
            compact ? "h-[22px]" : "h-[28px]",
          )}
          animated
        />
      </Link>
    </div>
  );
}
