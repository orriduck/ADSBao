import { Link, useSearchParams } from "react-router-dom";
import BrandLogo from "@/components/brand/BrandLogo";
import { setHomeSearchParamCarryover } from "@/features/app-shell/navigationModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

// The app mark belongs to the global control rail, rather than to the first
// content row of every sidebar. Keeping it as a link also preserves the
// existing, predictable route back to the home directory.
export default function AppToolbarBrand({ className = "" }) {
  const { locale, t } = useI18n();
  const [searchParams] = useSearchParams();
  const homeHref = setHomeSearchParamCarryover(searchParams as any);
  const wordmark = String(locale || "").toLowerCase().startsWith("zh")
    ? t("brand.wordmarkZh")
    : "ADSBao";

  return (
    <Link
      to={homeHref}
      aria-label={t("nav.homePage")}
      title={t("nav.homePage")}
      className={cn(
        "app-toolbar-brand inline-flex h-[var(--atc-toolbar-cell-size)] shrink-0 touch-manipulation items-center rounded-[2px] px-1 text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-atc-accent",
        className,
      )}
    >
      <BrandLogo
        height={18}
        wordmark={wordmark}
        ariaLabel={wordmark}
        className="pointer-events-none block h-[18px] w-auto"
        animated
      />
    </Link>
  );
}
