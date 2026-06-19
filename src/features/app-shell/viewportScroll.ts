type ScrollTarget =
  | HTMLElement
  | null
  | undefined
  | (() => HTMLElement | null | undefined);

const VIEWPORT_SCROLL_RESET_DELAYS_MS = [120, 360] as const;

function resolveScrollTarget(target: ScrollTarget) {
  return typeof target === "function" ? target() : target;
}

export function resetViewportScroll(target?: ScrollTarget) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  resolveScrollTarget(target)?.scrollTo({ top: 0, left: 0 });
}

export function scheduleViewportScrollReset(target?: ScrollTarget) {
  if (typeof window === "undefined") return () => {};

  resetViewportScroll(target);

  // iOS standalone may settle root scroll after rotation and route commits.
  let frameId: number | null = window.requestAnimationFrame(() => {
    frameId = null;
    resetViewportScroll(target);
  });
  const timeoutIds = VIEWPORT_SCROLL_RESET_DELAYS_MS.map((delayMs) =>
    window.setTimeout(() => resetViewportScroll(target), delayMs),
  );
