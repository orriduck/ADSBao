import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { fetchFreshTrackedAircraftPayload } from "./freshTrackedAircraftRequest";

describe("fetchFreshTrackedAircraftPayload", () => {
  it("shares one in-flight no-store request across Strict Mode effect mounts", async () => {
    let fetchCount = 0;
    let resolveResponse: ((value: any) => void) | undefined;
    const fetcher = () => {
      fetchCount += 1;
      return new Promise<any>((resolve) => {
        resolveResponse = resolve;
      });
    };

    const first = fetchFreshTrackedAircraftPayload(" baw51b ", { fetcher });
    const second = fetchFreshTrackedAircraftPayload("BAW51B", { fetcher });

    assert.equal(first, second);
    assert.equal(fetchCount, 1);
    resolveResponse?.({
      ok: true,
      status: 200,
      json: async () => ({ ac: [{ flight: "BAW51B" }] }),
    });
    assert.deepEqual(await second, { ac: [{ flight: "BAW51B" }] });
  });

  it("starts a new fresh request after the shared request settles", async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ ac: [] }),
      };
    };

    await fetchFreshTrackedAircraftPayload("TEST901", { fetcher });
    await fetchFreshTrackedAircraftPayload("TEST901", { fetcher });

    assert.equal(fetchCount, 2);
  });
});
