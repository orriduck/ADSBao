const endpointPathFromUrl = (url) => {
  try {
    return new URL(String(url), "http://localhost").pathname;
  } catch {
    return String(url || "");
  }
};

export const formatAuditLogLine = ({
  endpointPath,
  status,
  durationMs,
}) =>
  `[audit:${endpointPath || "/"}]: ${status} +${Math.round(
    durationMs,
  )}ms`;

export const withAuditLogging = (fetchImpl, { service = 'API' } = {}) => {
  return async (url, options) => {
    const start = performance.now()
    const endpointPath = endpointPathFromUrl(url) || service
    try {
      const response = await fetchImpl(url, options)
      const durationMs = Math.round(performance.now() - start)
      console.log(formatAuditLogLine({
        endpointPath,
        status: response.status,
        durationMs,
      }))
      return response
    } catch (err) {
      const durationMs = Math.round(performance.now() - start)
      console.log(formatAuditLogLine({
        endpointPath,
        status: "ERROR",
        durationMs,
      }))
      throw err
    }
  }
}
