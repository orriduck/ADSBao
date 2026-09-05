import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

/** Shared behavior for the two multi-select filter menus. */
export function useFilterPopover() {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const restoreFocus = () => wrapperRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const aboveTrigger = below < 240 && above > below;
      setPanelStyle({
        position: "fixed", width,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        ...(aboveTrigger ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        maxHeight: Math.max(44, Math.min(320, aboveTrigger ? above : below)),
      });
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const positioned = panelStyle !== null;
  useLayoutEffect(() => {
    if (open && positioned) panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open, positioned]);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: Event) => {
      if (wrapperRef.current?.contains(event.target as Node) || panelRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [open]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      restoreFocus();
      return;
    }
    const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0 || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  return { open, setOpen, panelStyle, wrapperRef, panelRef, menuId, onPanelKeyDown };
}
