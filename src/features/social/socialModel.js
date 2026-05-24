export const SOCIAL_ACTIVE_WINDOW_MS = 90_000;

export const SOCIAL_REACTIONS = Object.freeze([
  { key: "fire", icon: "🔥", labelKey: "social.reactions.fire" },
  { key: "walk", icon: "🚶", labelKey: "social.reactions.walk" },
  { key: "like", icon: "👍", labelKey: "social.reactions.like" },
  { key: "ticket", icon: "🎫", labelKey: "social.reactions.ticket" },
  { key: "camera", icon: "📷", labelKey: "social.reactions.camera" },
]);

export const SOCIAL_REACTION_KEYS = Object.freeze(
  SOCIAL_REACTIONS.map((reaction) => reaction.key),
);

export const SOCIAL_REACTION_KEY_SET = new Set(SOCIAL_REACTION_KEYS);

const SOCIAL_ENTITY_TYPES = new Set(["airport", "aircraft"]);

const normalizeAirportCode = (value) => {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(code) ? code : "";
};

export const normalizeAircraftSocialKey = (value) => {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (/^~?[0-9A-F]{6}$/.test(key)) return key.replace(/^~/, "");
  return /^[A-Z0-9]{2,12}$/.test(key) ? key : "";
};

export function normalizeSocialEntityInput(rawBody) {
  if (!rawBody || typeof rawBody !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const entityType = String(rawBody.entityType || "").trim().toLowerCase();
  if (!SOCIAL_ENTITY_TYPES.has(entityType)) {
    return { ok: false, error: "Invalid social entity" };
  }

  const entityKey =
    entityType === "airport"
      ? normalizeAirportCode(rawBody.entityKey)
      : normalizeAircraftSocialKey(rawBody.entityKey);
  if (!entityKey) return { ok: false, error: "Invalid social entity key" };

  const contextAirportIcao =
    normalizeAirportCode(rawBody.contextAirportIcao) ||
    (entityType === "airport" ? entityKey : "");

  return {
    ok: true,
    value: {
      entityType,
      entityKey,
      contextAirportIcao,
    },
  };
}

export function normalizeSocialReactionInput(rawBody) {
  const entity = normalizeSocialEntityInput(rawBody);
  if (!entity.ok) return entity;

  const reaction = String(rawBody.reaction || "").trim().toLowerCase();
  if (!SOCIAL_REACTION_KEY_SET.has(reaction)) {
    return { ok: false, error: "Invalid reaction" };
  }

  return {
    ok: true,
    value: {
      ...entity.value,
      reaction,
    },
  };
}

export function emptyReactionCounts() {
  return Object.fromEntries(SOCIAL_REACTION_KEYS.map((key) => [key, 0]));
}

export function countReactionRows(rows = []) {
  const reactions = emptyReactionCounts();
  for (const row of rows) {
    const reaction = row?.reaction;
    if (SOCIAL_REACTION_KEY_SET.has(reaction)) {
      reactions[reaction] += Number(row.count || 1);
    }
  }
  return reactions;
}

export function buildSocialSummary({
  entityType,
  entityKey,
  watching = 0,
  reactionRows = [],
  viewerRows = [],
} = {}) {
  return {
    entityType,
    entityKey,
    watching: Math.max(0, Number(watching) || 0),
    reactions: countReactionRows(reactionRows),
    viewerReactions: viewerRows
      .map((row) => row?.reaction)
      .filter((reaction) => SOCIAL_REACTION_KEY_SET.has(reaction)),
  };
}

export function getSocialActivityLevel(summary = {}) {
  const reactionTotal = Object.values(summary.reactions || {}).reduce(
    (total, count) => total + (Number(count) || 0),
    0,
  );
  const activity = (Number(summary.watching) || 0) + reactionTotal;
  if (activity >= 10) return "strong";
  if (activity >= 4) return "pulse";
  if (activity >= 1) return "subtle";
  return "none";
}
