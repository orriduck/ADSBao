"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { History, Home, Info, LogIn } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch.jsx";
import ThemeToggle from "@/components/app-shell/ThemeToggle.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";

const PAGE_ITEMS = [
  { href: "/", labelKey: "nav.homePage", Icon: Home },
  { href: "/about", labelKey: "nav.about", Icon: Info },
  { href: "/changelog", labelKey: "nav.changelog", Icon: History },
];

function resolveActiveHref(pathname) {
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";
  if (segment === "about") return "/about";
  if (segment === "changelog") return "/changelog";
  return "/";
}

export default function PageNavigationDock() {
  const { t } = useI18n();
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();
  const { isLoaded, isSignedIn } = useUser();
  const showSignedIn = isLoaded && isSignedIn;

  return (
    <nav className="page-nav-dock" aria-label={t("nav.homePage")}>
      <div className="page-nav-dock__bar toolbar-reveal">
        {PAGE_ITEMS.map((item) => {
          const Icon = item.Icon;
          const active = item.href === activeHref;
          const label = t(item.labelKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ctrl-btn page-nav-dock__button ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Icon aria-hidden="true" />
            </Link>
          );
        })}

        <span className="ctrl-sep page-nav-dock__sep" aria-hidden="true" />

        <LanguageSwitch
          className="page-nav-dock__button"
          menuPlacement="bottom"
          menuAlign="right"
        />

        <ThemeToggle
          className="ctrl-btn page-nav-dock__button page-nav-dock__button--theme"
          iconKey={themeIconKey}
          preference={themePreference}
          title={themeTitle}
          onClick={cycleTheme}
        />

        <span className="ctrl-sep page-nav-dock__sep" aria-hidden="true" />

        {!isLoaded ? (
          <div className="page-nav-dock__account" aria-hidden="true" />
        ) : showSignedIn ? (
          <div className="page-nav-dock__account" aria-label={t("auth.account")}>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-7 w-7 rounded-[2px]",
                },
              }}
            />
          </div>
        ) : (
          <SignInButton mode="modal">
            <button
              type="button"
              className="ctrl-btn page-nav-dock__button"
              title={t("auth.signIn")}
              aria-label={t("auth.signIn")}
            >
              <LogIn aria-hidden="true" />
            </button>
          </SignInButton>
        )}
      </div>
    </nav>
  );
}
