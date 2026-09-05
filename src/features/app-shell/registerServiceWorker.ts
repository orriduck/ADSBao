type ServiceWorkerContainerLike = {
  register: (
    url: string,
    options?: { scope?: string; updateViaCache?: "none" },
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
  documentRef = typeof document === "undefined" ? null : document,
}: {
  prod?: boolean;
  windowRef?: WindowLike | null;
  serviceWorker?: ServiceWorkerContainerLike | null;
  documentRef?: { readyState: string } | null;
} = {}) {
  if (!prod || !windowRef || !serviceWorker) return;

  const register = () => {
    void serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Best-effort static shell cache; live data paths must keep working.
    });
  };
  if (documentRef?.readyState === "complete") register();
  else windowRef.addEventListener("load", register, { once: true });
}
