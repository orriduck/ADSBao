"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

type SonnerTheme = "light" | "dark" | "system";

// Mirror <html data-theme> into the Sonner Toaster. Sonner's
// "system" theme reads prefers-color-scheme, but the app's theme is
// controlled explicitly via the data-theme cookie/attribute, so
// "system" can disagree with the rest of the UI.
const resolveToasterTheme = (theme: unknown): SonnerTheme =>
  theme === "dark" ? "dark" : "light";

const resolveAttrTheme = (): SonnerTheme => {
  if (typeof document === "undefined") return "dark";
  return resolveToasterTheme(document.documentElement.getAttribute("data-theme"));
};

export default function ThemedToaster({
  initialTheme = "dark",
  ...rest
}: Record<string, any>) {
  const [theme, setTheme] = useState(resolveToasterTheme(initialTheme));

  useEffect(() => {
    const sync = () => setTheme(resolveAttrTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return <Toaster theme={theme as SonnerTheme} {...rest} />;
}
