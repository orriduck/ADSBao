import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { SignInButton, UserButton, useUser } from "@/platform/auth/clerkClient";
import { GitBranch, History, Home, Info, LogIn } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
import { buildPageNavigationHref } from "@/features/app-shell/navigationModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useThemePreference } from "@/features/app-shell/useThemePreference";
import {
  Toolbar,
  ToolbarAccountSlot,
  ToolbarButton,
  ToolbarSeparator,
  toolbarButtonVariants,
} from "@/components/ui/Toolbar";

const PAGE_ITEMS = [
  { href: "/", labelKey: "nav.homePage", Icon: Home },
  { href: "/about", labelKey: "nav.about", Icon: Info },
  { href: "/mechanism", labelKey: "nav.mechanism", Icon: GitBranch },
  { href: "/changelog", labelKey: "nav.changelog", Icon: History },
];

function resolveActiveHref(pathname) {
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";
  if (segment === "about") return "/about";
  if (segment === "mechanism") return "/mechanism";
  if (segment === "changelog") return "/changelog";
  return "/";
}

// Reuse the airport detail map-rail button tone so every page's toolbar
// shares one interaction style: hover reveals a soft frosted tint (not a
// dark-ink fill), active flips to the glass capsule.
const buttonClass = toolbarButtonVariants({ tone: "rail" });

export default function PageNavigationDock() {
  const { locale, t } = useI18n();
  const { pathname } = useLocation();
  const activeHref = resolveActiveHref(pathname);
  const {
    themePreference,
    themeTitle,
    themeIconKey,
    cycleTheme,
    selectTheme,
  } = useThemePreference();
  const { isLoaded, isSignedIn } = useUser();
  const showSignedIn = isLoaded && isSignedIn;
  // Mobile pins the dock to the bottom of the viewport, so the language
  // and theme menus need to flip upward to stay on-screen. Desktop keeps
  // the dock at the top and opens menus downward as before.
  const [isMobileDock, setIsMobileDock] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(max-width: 720px)");
    const apply = () => setIsMobileDock(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  const menuPlacement = isMobileDock ? "top" : "bottom";
  // Mount to <body> so the dock's position:fixed is anchored to the
  // viewport. Some route wrappers (e.g. HomeScreen's app-route-transition)
  // set `will-change: transform`, which would otherwise become the
  // containing block and pin the dock to the bottom of the document
  // instead of the visible viewport on long mobile pages.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    setPortalTarget(document.body);
  }, []);

  const dock = (
    <nav className="page-nav-dock" aria-label={t("nav.homePage")}>
      <Toolbar reveal={false}>
        {PAGE_ITEMS.map((item) => {
          const Icon = item.Icon;
          const active = item.href === activeHref;
          const label = t(item.labelKey);
          return (
            <ToolbarButton
              key={item.href}
              tone="rail"
              asChild
              active={active}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Link to={buildPageNavigationHref(item.href, locale)}>
                <Icon aria-hidden="true" />
              </Link>
            </ToolbarButton>
          );
        })}

        <ToolbarSeparator />

        <LanguageSwitch
          className={buttonClass}
          menuPlacement={menuPlacement}
          menuAlign="right"
        />

        <ThemeToggle
          className={buttonClass}
          iconKey={themeIconKey}
          preference={themePreference}
          title={themeTitle}
          onClick={cycleTheme}
          onSelectTheme={selectTheme}
          menuPlacement={menuPlacement}
          menuAlign="right"
        />

        {!isLoaded ? (
          <ToolbarAccountSlot aria-hidden="true" />
        ) : showSignedIn ? (
          <ToolbarAccountSlot aria-label={t("auth.account")}>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-7 w-7 rounded-[2px]",
                },
              }}
            />
          </ToolbarAccountSlot>
        ) : (
          <SignInButton mode="modal">
            <ToolbarButton tone="rail" title={t("auth.signIn")} aria-label={t("auth.signIn")}>
              <LogIn aria-hidden="true" />
            </ToolbarButton>
          </SignInButton>
        )}
      </Toolbar>
    </nav>
  );

  return portalTarget ? createPortal(dock, portalTarget) : dock;
}
