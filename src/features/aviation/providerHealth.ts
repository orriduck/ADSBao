// Adaptive provider selector for upstream ADS-B feeds.
//
// Cold start: no preferred provider → race all providers, stick with the
// winner. Steady state: use the preferred provider only (single outbound
// call per request). Failure: clear preferred → next request re-races
// to pick a fresh winner, including the just-failed provider in case the
// error was transient.
//
// State is per-process. Warm app instances reuse memory across requests, so
// this gives us "sticky on the same instance, re-race on cold start" — the
// cost is one extra race per cold start, and the happy path is
// single-provider load.

export function createAdaptiveProviderSelector() {
  let preferredId = null;
  return {
    getPreferredId: () => preferredId,
    setPreferredId: (id) => {
      preferredId = id || null;
    },
    clear: () => {
      preferredId = null;
    },
  };
}

// Race providers in parallel; resolve with the first to succeed along with
// the provider that produced the payload. If every provider rejects, throw
// the AggregateError raised by Promise.any — its .errors[] mirrors the
// input order so callers can pair rejections back to providers for logging.
export async function raceProviders(providers, fetcher) {
  if (!providers || providers.length === 0) {
    throw new Error("raceProviders: empty provider list");
  }
  const attempts = providers.map(async (provider) => {
    const payload = await fetcher(provider);
    return { provider, payload };
  });
  return Promise.any(attempts);
}
