const endpointPathFromUrl = (url) => {
  try {
    return new URL(String(url), "http://localhost").pathname;
  } catch {
    return String(url || "");
  }
};

const readDataSourceHeader = (response) => {
  if (!response || typeof response.headers?.get !== "function") return null;
  const value = response.headers.get("x-data-source");
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const formatAuditLogLine = ({
  endpointPath,
  status,
  durationMs,
  source = null,
}) => {
  const base = `[audit:${endpointPath || "/"}]: ${status} +${Math.round(
    durationMs,
  )}ms`;
  return source ? `${base} (${source})` : base;
};

export const withAuditLogging = (fetchImpl, { service = "API" } = {}) => {
  return async (url, options) => {
    const start = performance.now();
    const endpointPath = endpointPathFromUrl(url) || service;
    try {
      const response = await fetchImpl(url, options);
      const durationMs = Math.round(performance.now() - start);
      console.log(
        formatAuditLogLine({
          endpointPath,
          status: response.status,
          durationMs,
          source: readDataSourceHeader(response),
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
