"use client";

export const SOCIAL_SESSION_STORAGE_KEY = "adsbao:social:session";

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function getSocialSessionId({
  storage = typeof window !== "undefined" ? window.localStorage : null,
} = {}) {
  if (!storage) return "";
  try {
    const existing = storage.getItem(SOCIAL_SESSION_STORAGE_KEY);
    if (existing) return existing;
    const next = createSessionId();
    storage.setItem(SOCIAL_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return "";
  }
}

function buildSocialHeaders() {
  const headers = { "Content-Type": "application/json" };
  const sessionId = getSocialSessionId();
  if (sessionId) headers["x-adsbao-session"] = sessionId;
  return headers;
}

const encodeQuery = (entity) => {
  const params = new URLSearchParams({
    entityType: entity.entityType,
    entityKey: entity.entityKey,
  });
  if (entity.contextAirportIcao) {
    params.set("contextAirportIcao", entity.contextAirportIcao);
  }
  return params.toString();
};

export async function postSocialPresence(entity, { signal } = {}) {
  const response = await fetch("/api/social/presence", {
    method: "POST",
    headers: buildSocialHeaders(),
    body: JSON.stringify(entity),
    signal,
  });
  if (!response.ok) throw new Error(`Presence failed (${response.status})`);
  return response.json();
}

export async function postSocialReaction(entity, reaction, { signal } = {}) {
  const response = await fetch("/api/social/reaction", {
    method: "POST",
    headers: buildSocialHeaders(),
    body: JSON.stringify({ ...entity, reaction }),
    signal,
  });
  if (!response.ok) throw new Error(`Reaction failed (${response.status})`);
  return response.json();
}

export async function fetchSocialSummary(entity, { signal } = {}) {
  const response = await fetch(`/api/social/summary?${encodeQuery(entity)}`, {
    headers: buildSocialHeaders(),
    signal,
  });
  if (!response.ok) throw new Error(`Summary failed (${response.status})`);
  return response.json();
}
