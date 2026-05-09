export const withAuditLogging = (fetchImpl, { service = 'API', getParams } = {}) => {
  return async (url, options) => {
    const start = performance.now()
    try {
      const response = await fetchImpl(url, options)
      const duration_ms = Math.round(performance.now() - start)
      const params = typeof getParams === 'function' ? getParams(url) : null
      console.log("[audit:api]", {
        service,
        ...(params ? { params } : {}),
        status: response.status,
        duration_ms,
      })
      return response
    } catch (err) {
      const duration_ms = Math.round(performance.now() - start)
      console.log("[audit:api]", {
        service,
        error: err.message,
        duration_ms,
      })
      throw err
    }
  }
}
