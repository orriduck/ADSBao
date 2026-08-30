import assert from "node:assert/strict";
import { ThreeOsmVectorContextWorkerClient } from "./threeOsmVectorContextWorkerClient";
import type {
  ThreeOsmVectorContextWorkerRequest,
  ThreeOsmVectorContextWorkerResponse,
} from "./threeOsmVectorContextWorkerProtocol";
import type { ThreeOsmVectorWorkerLike } from "./threeOsmVectorContextWorkerClient";

class FakeWorker implements ThreeOsmVectorWorkerLike {
  onmessage:
    | ((event: MessageEvent<ThreeOsmVectorContextWorkerResponse>) => void)
    | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  posted: ThreeOsmVectorContextWorkerRequest | null = null;
  transfers: Transferable[] = [];
  terminated = false;

  postMessage(
    message: ThreeOsmVectorContextWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    this.posted = message;
    this.transfers = transfer;
  }

  terminate() {
    this.terminated = true;
  }

  respond(message: ThreeOsmVectorContextWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent);
  }
}

const workers: FakeWorker[] = [];
const clock = [100, 112];
const client = new ThreeOsmVectorContextWorkerClient(
  () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  },
  () => clock.shift() ?? 112,
);
const sourceBuffer = new Uint8Array([1, 2, 3]).buffer;
const resultPromise = client.build({
  tiles: [{ tile: { z: 13, x: 2480, y: 3029 }, data: sourceBuffer }],
  tileCenter: { z: 13, x: 2480.2, y: 3029.7 },
  centerLat: 42.3656,
  sceneZoom: 13,
  sourceZoom: 13,
  locale: "en",
});
const firstWorker = workers[0];
assert.equal(firstWorker.posted?.type, "build");
assert.notEqual(firstWorker.posted?.input.tiles[0].data, sourceBuffer);
assert.equal(sourceBuffer.byteLength, 3);
assert.equal(firstWorker.transfers.length, 1);
firstWorker.respond({
  type: "success",
  requestId: firstWorker.posted!.requestId,
  geometry: {
    roadPositions: {
      major: new Float32Array([0, 0, 0]),
      minor: new Float32Array(),
      service: new Float32Array(),
    },
    buildingRoofPositions: new Float32Array(),
    buildingWallPositions: new Float32Array(),
    labels: [],
    diagnostics: {
      tileCount: 1,
      decodeFailures: 0,
      roadFeatures: 1,
      roadSegments: 1,
      roadSourcePoints: 2,
      buildings: 0,
      buildingRoofTriangles: 0,
      buildingSourcePoints: 0,
      labelCandidates: 0,
      labelCount: 0,
      labelAerodromes: 0,
      labelPlaces: 0,
      labelRoads: 0,
      labelWaters: 0,
      labelSkippedFeatures: 0,
      skippedFeatures: 0,
      vertexCount: 1,
    },
  },
  workerBuildMs: 7,
});
const result = await resultPromise;
assert.equal(result.workerBuildMs, 7);
assert.equal(result.roundTripMs, 12);
assert.equal(result.geometry.diagnostics.roadFeatures, 1);

const superseded = client.build({
  tiles: [],
  tileCenter: { z: 13, x: 0, y: 0 },
  centerLat: 0,
  sceneZoom: 13,
  sourceZoom: 13,
  locale: "en",
});
const replacement = client.build({
  tiles: [],
  tileCenter: { z: 13, x: 1, y: 1 },
  centerLat: 1,
  sceneZoom: 13,
  sourceZoom: 13,
  locale: "en",
});
await assert.rejects(
  superseded,
  (error: any) => error?.name === "AbortError",
);
assert.equal(firstWorker.terminated, true);
assert.equal(workers.length, 2);
const secondWorker = workers[1];
secondWorker.respond({
  type: "success",
  requestId: secondWorker.posted!.requestId,
  geometry: result.geometry,
  workerBuildMs: 1,
});
assert.equal((await replacement).geometry.diagnostics.vertexCount, 1);
client.dispose();
assert.equal(secondWorker.terminated, true);

console.log("threeOsmVectorContextWorkerClient.test.ts ok");
