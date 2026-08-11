import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent";
import { runtimeEnvValue } from "@/platform/env/runtimeEnv";

function numberEnv(key: Parameters<typeof runtimeEnvValue>[0]) {
  const value = Number(runtimeEnvValue(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

const accountID = numberEnv("VITE_NEW_RELIC_ACCOUNT_ID");
const applicationID = numberEnv("VITE_NEW_RELIC_BROWSER_APP_ID");
const licenseKey = runtimeEnvValue("VITE_NEW_RELIC_BROWSER_LICENSE_KEY");

export const newRelicBrowser =
  accountID && applicationID && licenseKey
    ? new BrowserAgent({
        info: {
          applicationID: String(applicationID),
          beacon: "bam.nr-data.net",
          errorBeacon: "bam.nr-data.net",
          licenseKey,
          sa: 1,
        },
        init: {
          ajax: { deny_list: ["bam.nr-data.net"] },
          browser_consent_mode: { enabled: false },
          distributed_tracing: { enabled: true },
          performance: {
            capture_detail: false,
            capture_marks: false,
            capture_measures: true,
          },
          privacy: { cookies_enabled: true },
        },
        loader_config: {
          accountID,
          agentID: applicationID,
          applicationID,
          licenseKey,
          trustKey: accountID,
        },
      })
    : null;

export function installNewRelicClickTracking() {
  if (!newRelicBrowser || window.__adsbaoNewRelicClickTrackingInstalled) return;
  window.__adsbaoNewRelicClickTrackingInstalled = true;

  window.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>(
        "[data-nr-action],button,a,[role='button'],input[type='submit']",
      );
      if (!control) return;

      // Deliberately record only a stable control category. Never transmit
      // search terms, account data, link destinations, or visible text.
      const action =
        control.dataset.nrAction ||
        (control instanceof HTMLAnchorElement
          ? "link"
          : control instanceof HTMLButtonElement
            ? "button"
            : control.getAttribute("role") === "button"
              ? "role_button"
              : "submit");
      newRelicBrowser.addPageAction("ui_click", {
        action,
        page_path: window.location.pathname,
      });
    },
    { capture: true },
  );
}

declare global {
  interface Window {
    __adsbaoNewRelicClickTrackingInstalled?: boolean;
  }
}
