"use client";

import { Monitor, Moon, Sun } from "lucide-react";

const THEME_ICONS = {
  monitor: Monitor,
  moon: Moon,
  sun: Sun,
};

export default function ThemeToggle({
  className,
  iconKey = "monitor",
  preference = "system",
  title,
  onClick,
}) {
  const ThemeIcon = THEME_ICONS[iconKey] || Monitor;

  return (
    <button type="button" className={className} title={title} onClick={onClick}>
      <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{preference}</span>
    </button>
  );
}
