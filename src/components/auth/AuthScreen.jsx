"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import DitherPageShell from "@/components/app-shell/DitherPageShell.jsx";
import ThemeToggle from "@/components/app-shell/ThemeToggle.jsx";
import NavMenu from "@/components/navigation/NavMenu.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";

const CLERK_APPEARANCE = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full rounded-[2px] border border-[var(--atc-line)] bg-atc-card text-atc-text shadow-none",
    headerTitle: "font-nav text-atc-text",
    headerSubtitle: "text-atc-dim",
    socialButtonsBlockButton:
      "rounded-[2px] border border-[var(--atc-line)] bg-[var(--atc-elev)] text-atc-text",
    formFieldInput:
      "rounded-[2px] border border-[var(--atc-line)] bg-atc-bg text-atc-text",
    formButtonPrimary:
      "rounded-[2px] bg-atc-orange font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-atc-bg",
    footerActionLink: "text-atc-orange",
  },
};

export default function AuthScreen({ mode = "sign-in" }) {
  const { t } = useI18n();
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();
  const isSignUp = mode === "sign-up";

  const renderThemeToggle = (className) => (
    <ThemeToggle
      className={className}
      iconKey={themeIconKey}
      preference={themePreference}
      title={themeTitle}
      onClick={cycleTheme}
    />
  );

  return (
    <DitherPageShell
      className="search-screen auth-screen"
      mobileLeft={<NavMenu variant="mobile" />}
      footerLeft={<NavMenu />}
      renderThemeToggle={renderThemeToggle}
    >
      <div className="mx-6 flex flex-none items-center justify-between gap-3 border-b border-[var(--atc-line)] py-3.5">
        <div>
          <div className="endf-label endf-label--ghost">{t("auth.account")}</div>
          <div className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-atc-text">
            {isSignUp ? t("auth.signUp") : t("auth.signIn")}
          </div>
        </div>
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="endf-chip shrink-0 transition-colors hover:border-atc-orange hover:text-atc-orange"
        >
          <span>{isSignUp ? t("auth.signIn") : t("auth.signUp")}</span>
        </Link>
      </div>

      <div className="flex flex-1 items-start overflow-y-auto px-6 py-5">
        {isSignUp ? (
          <SignUp
            appearance={CLERK_APPEARANCE}
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
          />
        ) : (
          <SignIn
            appearance={CLERK_APPEARANCE}
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/"
          />
        )}
      </div>
    </DitherPageShell>
  );
}
