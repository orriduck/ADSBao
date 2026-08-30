import type { ThreeOsmVectorContextGeometryInput } from "./threeOsmVectorContextGeometry";
import type {
  ThreeOsmVectorContextWorkerRequest,
  ThreeOsmVectorContextWorkerResponse,
  ThreeOsmVectorContextWorkerResult,
} from "./threeOsmVectorContextWorkerProtocol";

export type ThreeOsmVectorWorkerLike = {
  onmessage:
    | ((event: MessageEvent<ThreeOsmVectorContextWorkerResponse>) => void)
    | null;
  onerror: ((event: { message?: string }) => void) | null;
  postMessage: (
    message: ThreeOsmVectorContextWorkerRequest,
    transfer?: Transferable[],
  ) => void;
  terminate: () => void;
};

type ActiveRequest = {
  requestId: number;
  reject: (error: Error) => void;
};

function createAbortError() {
  const error = new Error("Vector geometry request was superseded");
  error.name = "AbortError";
  return error;
}

function createVectorWorker(): ThreeOsmVectorWorkerLike {
  return new Worker(
    new URL("./threeOsmVectorContext.worker.ts", import.meta.url),
    {
      type: "module",
      name: "adsbao-three-osm-vector",
    },
  );
}

export class ThreeOsmVectorContextWorkerClient {
  private worker: ThreeOsmVectorWorkerLike | null = null;
  private activeRequest: ActiveRequest | null = null;
  private nextRequestId = 1;

  constructor(
    private readonly workerFactory: () => ThreeOsmVectorWorkerLike =
      createVectorWorker,
    private readonly now: () => number = () => performance.now(),
  ) {}

  build(
    input: ThreeOsmVectorContextGeometryInput,
  ): Promise<ThreeOsmVectorContextWorkerResult> {
    this.cancelActive();
    if (!this.worker) this.worker = this.workerFactory();
    const worker = this.worker;
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    const startedAt = this.now();
    const tiles = input.tiles.map((payload) => ({
      tile: payload.tile,
      data: payload.data.slice(0),
      contextOnly: payload.contextOnly,
    }));
    const request: ThreeOsmVectorContextWorkerRequest = {
      type: "build",
      requestId,
      input: { ...input, tiles },
    };

    return new Promise((resolve, reject) => {
      this.activeRequest = { requestId, reject };
      worker.onmessage = (event) => {
        const response = event.data;
        if (
          response?.requestId !== requestId ||
          this.activeRequest?.requestId !== requestId
        ) {
          return;
        }
        this.activeRequest = null;
        worker.onmessage = null;
        worker.onerror = null;
        if (response.type === "failure") {
          reject(new Error(response.message));
          return;
        }
        resolve({
          ...response,
          roundTripMs: this.now() - startedAt,
        });
      };
      worker.onerror = (event) => {
        if (this.activeRequest?.requestId !== requestId) return;
        this.activeRequest = null;
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        reject(new Error(event.message || "Vector geometry worker crashed"));
      };
      try {
        worker.postMessage(
          request,
          tiles.map((payload) => payload.data),
        );
      } catch (error) {
        this.activeRequest = null;
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  cancelActive() {
    if (!this.activeRequest || !this.worker) return;
    const { reject } = this.activeRequest;
    this.activeRequest = null;
    const worker = this.worker;
    this.worker = null;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    reject(createAbortError());
  }

  dispose() {
    this.cancelActive();
    this.worker?.terminate();
    this.worker = null;
  }
}
