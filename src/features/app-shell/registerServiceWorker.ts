type ServiceWorkerContainerLike = {
  register: (
    url: string,
    options?: { scope?: string },
  ) => Promise<unknown>;
};

type WindowLike = {
  addEventListener: (
    event: "load",
    handler: () => void,
    options?: { once?: boolean },
  ) => void;
};

export function registerAdsbaoServiceWorker({
  prod = import.meta.env.PROD,
  windowRef = typeof window === "undefined" ? null : window,
  serviceWorker =
    typeof navigator === "undefined" ? null : navigator.serviceWorker,
}: {
  prod?: boolean;
  windowRef?: WindowLike | null;
  serviceWorker?: ServiceWorkerContainerLike | null;
} = {}) {
  if (!prod || !windowRef || !serviceWorker) return;

  windowRef.addEventListener(
    "load",
    () => {
      void serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Best-effort static shell cache; live data paths must keep working.
      });
    },
    { once: true },
  );
}
