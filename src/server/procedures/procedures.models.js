export const PROCEDURE_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
});

export class ProcedureNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProcedureNotFoundError";
    this.status = 404;
  }
}
