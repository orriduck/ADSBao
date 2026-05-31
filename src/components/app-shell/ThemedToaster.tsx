"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

// Mirror <html data-theme> into the Sonner Toaster. Sonner's
// "system" theme reads prefers-color-scheme, but the app's theme is
// controlled explicitly via the data-theme cookie/attribute, so
// "system" can disagree with the rest of the UI.
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
