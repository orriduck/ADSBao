import assert from "node:assert/strict";

import {
  createAdaptiveProviderSelector,
  isRetriableStatus,
  raceProviders,
} from "./providerHealth.js";

// isRetriableStatus
assert.equal(isRetriableStatus(503), true);
assert.equal(isRetriableStatus(429), true);
assert.equal(isRetriableStatus(500), true);
assert.equal(isRetriableStatus(404), false);
assert.equal(isRetriableStatus(200), false);

// Selector lifecycle
{
  const selector = createAdaptiveProviderSelector();
  assert.equal(selector.getPreferredId(), null);
  selector.setPreferredId("adsb.lol");
  assert.equal(selector.getPreferredId(), "adsb.lol");
  selector.clear();
  assert.equal(selector.getPreferredId(), null);
}

// raceProviders: first fulfilled wins, carries the provider reference
{
  const providers = [{ id: "slow" }, { id: "fast" }];
  const fetcher = (provider) =>
    new Promise((resolve) => {
      const delay = provider.id === "fast" ? 1 : 30;
      setTimeout(() => resolve({ ok: provider.id }), delay);
    });

  const { provider, payload } = await raceProviders(providers, fetcher);
  assert.equal(provider.id, "fast");
  assert.deepEqual(payload, { ok: "fast" });
}

// raceProviders: AggregateError when every provider rejects
{
  const providers = [{ id: "a" }, { id: "b" }];
  const fetcher = (provider) =>
    Promise.reject(new Error(`${provider.id} down`));

  let caught = null;
  try {
    await raceProviders(providers, fetcher);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected raceProviders to reject");
  assert.equal(caught.name, "AggregateError");
  assert.equal(caught.errors.length, 2);
  assert.equal(caught.errors[0].message, "a down");
  assert.equal(caught.errors[1].message, "b down");
}

// raceProviders: a single fulfillment is enough even when one rejects
{
  const providers = [{ id: "broken" }, { id: "ok" }];
  const fetcher = (provider) =>
    provider.id === "broken"
      ? Promise.reject(new Error("nope"))
      : Promise.resolve({ ok: true });

  const { provider } = await raceProviders(providers, fetcher);
  assert.equal(provider.id, "ok");
}

// raceProviders: empty list is a programmer error
{
  let caught = null;
  try {
    await raceProviders([], () => Promise.resolve());
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected raceProviders([]) to throw");
}

console.log("providerHealth.test.js: ok");
