interface CloudflareFetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface CloudflareWorkerEnv {
  ASSETS: CloudflareFetcher;
  ADSBAO_BACKEND: CloudflareFetcher;
  VITE_NEW_RELIC_ACCOUNT_ID?: string;
  VITE_NEW_RELIC_BROWSER_APP_ID?: string;
  VITE_NEW_RELIC_BROWSER_LICENSE_KEY?: string;
}
