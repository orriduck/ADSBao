import { AVIATION_REQUEST_TIMEOUT_MS } from "../../config/aviation";
import { readResponseText } from "../../app/api/_shared/apiProxySecurity";

export const createTimeoutSignal = (timeoutMs) =>
  typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(timeoutMs)
    : undefined;

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
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await readResponseText(response, {
    label: String(url),
    maxBytes,
  });
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Expected JSON from ${url}`);
  }
};
