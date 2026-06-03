const endpointPathFromUrl = (url: unknown) => {
  try {
    return new URL(String(url), "http://localhost").pathname;
  } catch {
    return String(url || "");
  }
};

const readHeader = (response: any, name: string) => {
  if (!response || typeof response.headers?.get !== "function") return null;
  const value = response.headers.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
};

// Render a provider chain like "adsb.lol:502;adsb.fi:200" as
// "adsb.lol:502 → adsb.fi" — the last entry omits its status because the
// outer log already shows the final status. A single attempt collapses to
// just the provider id ("adsb.lol") to avoid noise on the happy path.
const formatProviderChain = (attempts: string) => {
  const parts = attempts.split(";").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const [id] = parts[0].split(":");
    return id || parts[0];
  }
  return parts
    .map((part, index) => {
      if (index === parts.length - 1) {
        const [id] = part.split(":");
        return id || part;
      }
      return part;
    })
    .join(" → ");
};

const formatAuditLogLine = ({
  endpointPath,
  status,
  durationMs,
  source = null,
}: Record<string, any>) => {
  const base = `[audit:${endpointPath || "/"}]: ${status} +${Math.round(
    durationMs,
  )}ms`;
  return source ? `${base} (${source})` : base;
};

export const withAuditLogging = (fetchImpl: any, { service = "API" }: Record<string, any> = {}) => {
  return async (url: unknown, options: Record<string, any> = {}) => {
    const start = performance.now();
    const endpointPath = endpointPathFromUrl(url) || service;
    try {
      const response = await fetchImpl(url, options);
      const durationMs = Math.round(performance.now() - start);
      const attempts = readHeader(response, "x-provider-attempts");
      const source = attempts
        ? formatProviderChain(attempts)
        : readHeader(response, "x-data-source");
      console.log(
        formatAuditLogLine({
          endpointPath,
          status: response.status,
          durationMs,
          source,
        }),
      );
      return response;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      console.log(
        formatAuditLogLine({
          endpointPath,
          status: "ERROR",
          durationMs,
        }),
      );
      throw err;
    }
  };
};
