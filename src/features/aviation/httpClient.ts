import { AVIATION_REQUEST_TIMEOUT_MS } from "../../config/aviation";
import { readResponseText } from "../../app/api/_shared/apiProxySecurity";

export const createTimeoutSignal = (timeoutMs) =>
  typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(timeoutMs)
    : undefined;

// Carries the HTTP status alongside the message so status badges and retry
// logic can read it without parsing strings.
export class HttpError extends Error {
  status: number;
  url: string;
  constructor(status: number, url: string, message?: string) {
    super(message || `HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

export const fetchJson = async (
  fetchImpl: any,
  url: string,
  {
    timeoutMs = AVIATION_REQUEST_TIMEOUT_MS.json,
    maxBytes,
  }: Record<string, any> = {},
) => {
  const response = await fetchImpl(url, {
    signal: createTimeoutSignal(timeoutMs),
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new HttpError(response.status, String(url));
  const body = await readResponseText(response, {
    label: String(url),
    maxBytes,
  });
  try {
    const data = JSON.parse(body);
    // Stash the HTTP status on the parsed object so hooks can surface it in
    // the UI badge. Non-enumerable so it can't break JSON.stringify or
    // structural equality elsewhere.
    if (data && typeof data === "object") {
      Object.defineProperty(data, "__httpStatus", {
        value: response.status,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
    return data;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Expected JSON from ${url}`);
    }
    throw err;
  }
};

export function readResponseStatus(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "object") {
    const status = (value as Record<string, unknown>).__httpStatus;
    if (typeof status === "number") return status;
  }
  return null;
}

export function readErrorStatus(err: unknown): number | null {
  if (err instanceof HttpError) return err.status;
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  if (err instanceof Error) {
    const match = /HTTP\s+(\d{3})/.exec(err.message);
    if (match) return Number(match[1]);
  }
  return null;
}
