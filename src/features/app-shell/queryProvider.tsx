"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Single QueryClient per browser session. Sensible defaults that match how
// this app talks to its upstreams:
//   - staleTime 60s: aircraft / metar polls overwrite this with shorter
//     intervals per-query; static lookups (wiki, airports) get a quiet
//     baseline so the cache survives short navigations.
//   - gcTime 5min: keeps results around long enough to feel snappy on tab
//     re-entry without holding upstream bytes forever.
//   - retry 1: most upstreams (adsbdb, wikipedia, AviationWeather) are best-
//     effort. A single retry catches transient blips; more would mask real
//     outages and slow the UI down.
//   - refetchOnWindowFocus false: this app polls explicitly via the relevant
//     hooks; focus-driven refetch on top of that would double-pull.
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function QueryProvider({ children }) {
  // useState's lazy initializer guarantees a single client per provider
  // instance — top-level `new QueryClient()` would share one client across
  // every server-rendered request in dev.
  const [client] = useState(createQueryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
