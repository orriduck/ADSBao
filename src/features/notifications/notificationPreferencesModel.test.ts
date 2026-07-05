import assert from "node:assert/strict";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
  normalizeNotificationPreferences,
} from "./notificationPreferencesModel";

// Both toggles default OFF — this is an opt-in feature, never a surprise
// permission prompt or notification on first load.
{
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.nearbyAirportEnabled, false);
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.nearbyAircraftEnabled, false);
}

// Garbage / missing input falls back to defaults entirely.
{
  assert.deepEqual(
    normalizeNotificationPreferences(null),
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  assert.deepEqual(
    normalizeNotificationPreferences("nonsense"),
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  assert.deepEqual(
    normalizeNotificationPreferences({ nearbyAirportEnabled: "yes" }),
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
}

// Radius values clamp to the preset bounds rather than being rejected.
{
  const tooLow = normalizeNotificationPreferences({
    nearbyAirportRadiusNm: 0.1,
  });
  assert.equal(tooLow.nearbyAirportRadiusNm, 3);

  const tooHigh = normalizeNotificationPreferences({
    nearbyAircraftRadiusNm: 999,
  });
  assert.equal(tooHigh.nearbyAircraftRadiusNm, 20);

  const withinRange = normalizeNotificationPreferences({
    nearbyAirportRadiusNm: 10,
  });
  assert.equal(withinRange.nearbyAirportRadiusNm, 10);
}

// Merge only overwrites the patched fields.
{
  const merged = mergeNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES, {
    nearbyAircraftEnabled: true,
  });
  assert.equal(merged.nearbyAircraftEnabled, true);
  assert.equal(merged.nearbyAirportEnabled, false);
  assert.equal(merged.nearbyAircraftRadiusNm, 5);
}

console.log("notificationPreferencesModel.test.ts ok");
