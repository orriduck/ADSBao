import { AVIATION_REQUEST_TIMEOUT_MS } from "../../config/aviation.js";

export const createTimeoutSignal = (timeoutMs) =>
  typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(timeoutMs)
    : undefined;

export const fetchJson = async (
  fetchImpl,
  url,
  { timeoutMs = AVIATION_REQUEST_TIMEOUT_MS.json } = {},
) => {
  const response = await fetchImpl(url, {
    signal: createTimeoutSignal(timeoutMs),
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Expected JSON from ${url}`);
  }
};
