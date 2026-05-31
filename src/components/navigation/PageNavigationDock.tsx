"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { History, Home, Info, LogIn } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
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
  { href: "/changelog", labelKey: "nav.changelog", Icon: History },
];

function resolveActiveHref(pathname) {
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";
  if (segment === "about") return "/about";
  if (segment === "changelog") return "/changelog";
  return "/";
}

const buttonClass = toolbarButtonVariants({ tone: "soft" });

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
      <Toolbar>
        {PAGE_ITEMS.map((item) => {
          const Icon = item.Icon;
          const active = item.href === activeHref;
          const label = t(item.labelKey);
          return (
            <ToolbarButton
              key={item.href}
              asChild
              active={active}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Link href={item.href}>
                <Icon aria-hidden="true" />
              </Link>
            </ToolbarButton>
          );
        })}

        <ToolbarSeparator />

        <LanguageSwitch
          className={buttonClass}
          menuPlacement="bottom"
          menuAlign="right"
        />

        <ThemeToggle
          className={buttonClass}
          iconKey={themeIconKey}
          preference={themePreference}
          title={themeTitle}
          onClick={cycleTheme}
        />

        <ToolbarSeparator />

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
            <ToolbarButton title={t("auth.signIn")} aria-label={t("auth.signIn")}>
              <LogIn aria-hidden="true" />
            </ToolbarButton>
          </SignInButton>
        )}
      </Toolbar>
    </nav>
  );
}
