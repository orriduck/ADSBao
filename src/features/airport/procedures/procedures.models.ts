export const PROCEDURE_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
});

export class ProcedureNotFoundError extends Error {
  status: number;

  constructor(message = "No procedure data found") {
    super(message);
    this.name = "ProcedureNotFoundError";
    this.status = 404;
  }
}
