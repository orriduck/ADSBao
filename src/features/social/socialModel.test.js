import assert from "node:assert/strict";

import {
  SOCIAL_ACTIVE_WINDOW_MS,
  SOCIAL_REACTION_KEYS,
  buildSocialSummary,
  normalizeSocialEntityInput,
  normalizeSocialReactionInput,
} from "./socialModel.js";

assert.equal(SOCIAL_ACTIVE_WINDOW_MS, 90_000);
assert.deepEqual(SOCIAL_REACTION_KEYS, [
  "fire",
  "walk",
  "like",
  "ticket",
  "camera",
]);

{
  const airport = normalizeSocialEntityInput({
    entityType: "airport",
    entityKey: "kbos",
    contextAirportIcao: "kbos",
  });
  assert.deepEqual(airport, {
    ok: true,
    value: {
      entityType: "airport",
      entityKey: "KBOS",
      contextAirportIcao: "KBOS",
    },
  });

  const aircraft = normalizeSocialEntityInput({
    entityType: "aircraft",
    entityKey: " dal 977 ",
    contextAirportIcao: "kbos",
  });
  assert.deepEqual(aircraft.value, {
    entityType: "aircraft",
    entityKey: "DAL977",
    contextAirportIcao: "KBOS",
  });
}

assert.deepEqual(normalizeSocialEntityInput(null), {
  ok: false,
  error: "Invalid request body",
});
assert.equal(
  normalizeSocialEntityInput({ entityType: "ship", entityKey: "KBOS" }).error,
  "Invalid social entity",
);
assert.equal(
  normalizeSocialEntityInput({ entityType: "airport", entityKey: "??" }).error,
  "Invalid social entity key",
);

{
  const reaction = normalizeSocialReactionInput({
    entityType: "aircraft",
    entityKey: "a1b2c3",
    contextAirportIcao: "kbos",
    reaction: "camera",
  });
  assert.deepEqual(reaction.value, {
    entityType: "aircraft",
    entityKey: "A1B2C3",
    contextAirportIcao: "KBOS",
    reaction: "camera",
  });
}

assert.equal(
  normalizeSocialReactionInput({
    entityType: "airport",
    entityKey: "KBOS",
    reaction: "clap",
  }).error,
  "Invalid reaction",
);

{
  const summary = buildSocialSummary({
    entityType: "airport",
    entityKey: "KBOS",
    watching: 8,
    reactionRows: [
      { reaction: "fire", count: 4 },
      { reaction: "like", count: 8 },
      { reaction: "nonsense", count: 99 },
    ],
    viewerRows: [{ reaction: "like" }],
  });

  assert.deepEqual(summary, {
    entityType: "airport",
    entityKey: "KBOS",
    watching: 8,
    reactions: {
      fire: 4,
      walk: 0,
      like: 8,
      ticket: 0,
      camera: 0,
    },
    viewerReactions: ["like"],
  });
}
