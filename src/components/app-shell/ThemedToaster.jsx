"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

// Sonner respects a `theme` prop ("light" | "dark" | "system"). Passing
// "system" reads prefers-color-scheme, which is wrong here because the
// app's theme is controlled explicitly via the `data-theme` attribute
// on <html> (set server-side from the `theme` cookie and toggled in
// the client by useThemePreference). This wrapper mirrors that
// attribute into the Toaster so toasts stay legible after the user
// flips the theme without a reload.
const resolveAttrTheme = () => {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
};

export default function ThemedToaster({ initialTheme = "dark", ...rest }) {
  const [theme, setTheme] = useState(initialTheme);

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

  return <Toaster theme={theme} {...rest} />;
}
