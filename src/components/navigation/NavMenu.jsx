"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronUp, History, Home, Info } from "lucide-react";

// Drop-up menu rendered in the bottom-left footer slot of the
// DitherPageShell-based pages (Home / About / Changelog). Replaces the
// per-page footer link so navigation between the three sibling pages
// lives in one place. The trigger surfaces the current page label; the
// popover opens upward (drop-up) since the trigger lives at the bottom
// of the sidebar.

const ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/about", label: "About", Icon: Info },
  { href: "/changelog", label: "Changelog", Icon: History },
];

function resolveActive(pathname) {
  // Match by deepest first-segment so /aircraft/* and /airport/* fall
  // back to Home, while /about and /changelog match exactly.
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";
  if (segment === "about") return ITEMS[1];
  if (segment === "changelog") return ITEMS[2];
  return ITEMS[0];
}

export default function NavMenu({ variant = "footer" }) {
  const pathname = usePathname();
  const active = resolveActive(pathname);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleDocClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Close on navigation; route push is intercepted via the Link onClick.
  const handleSelect = () => setOpen(false);

  const isMobile = variant === "mobile";
  const triggerClass = isMobile
    ? "mobile-top-nav-link flex items-center gap-1.5"
    : "font-nav text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5";

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 w-44 overflow-hidden rounded-md border border-[var(--atc-line-strong)] bg-atc-card shadow-xl"
        >
          {ITEMS.map((item) => {
            const ItemIcon = item.Icon;
            const isActive = item.href === active.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={handleSelect}
                className={`font-nav flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  isActive
                    ? "bg-[color-mix(in_oklab,var(--atc-accent)_14%,transparent)] text-atc-text"
                    : "text-atc-faint hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] hover:text-atc-text"
                }`}
              >
                <ItemIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={triggerClass}
      >
        <active.Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{active.label}</span>
        <ChevronUp
          className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
