import { Link, useSearchParams } from "react-router-dom";
import BrandLogo from "@/components/brand/BrandLogo";
import { setHomeSearchParamCarryover } from "@/features/app-shell/navigationModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

// The app mark belongs to the global control rail, rather than to the first
// content row of every sidebar. Keeping it as a link also preserves the
// existing, predictable route back to the home directory.
export default function AppToolbarBrand({ className = "" }) {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const homeHref = setHomeSearchParamCarryover(searchParams as any);

  return (
    <Link
      to={homeHref}
      aria-label={t("nav.homePage")}
      title={t("nav.homePage")}
      className={cn(
        "app-toolbar-brand inline-flex size-[var(--atc-toolbar-cell-size)] shrink-0 touch-manipulation items-center justify-center rounded-[2px] p-0 text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-atc-accent",
        className,
      )}
    >
      <BrandLogo
        size={30}
        ariaLabel="ADSBao"
        className="app-toolbar-brand__mark pointer-events-none block size-[30px] object-cover"
        animated
      />
    </Link>
  );
}
