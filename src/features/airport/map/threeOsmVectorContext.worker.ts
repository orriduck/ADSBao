import { buildThreeOsmVectorContextGeometry } from "./threeOsmVectorContextGeometry";
import type {
  ThreeOsmVectorContextWorkerRequest,
  ThreeOsmVectorContextWorkerResponse,
} from "./threeOsmVectorContextWorkerProtocol";

type VectorWorkerScope = {
  onmessage:
    | ((event: MessageEvent<ThreeOsmVectorContextWorkerRequest>) => void)
    | null;
  postMessage: (
    message: ThreeOsmVectorContextWorkerResponse,
    transfer?: Transferable[],
  ) => void;
};

const workerScope = self as unknown as VectorWorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data;
  if (request?.type !== "build") return;
  const startedAt = performance.now();
  try {
    const geometry = buildThreeOsmVectorContextGeometry(request.input);
    const transfer = [
      geometry.roadPositions.major.buffer,
      geometry.roadPositions.minor.buffer,
      geometry.roadPositions.service.buffer,
      geometry.surfacePositions.water.buffer,
      geometry.surfacePositions.natural.buffer,
      geometry.surfacePositions.developed.buffer,
      geometry.surfacePositions.aeroway.buffer,
      geometry.buildingRoofPositions.buffer,
      geometry.buildingWallPositions.buffer,
    ] as ArrayBuffer[];
    workerScope.postMessage(
      {
        type: "success",
        requestId: request.requestId,
        geometry,
        workerBuildMs: performance.now() - startedAt,
      },
      transfer,
    );
  } catch (error) {
    workerScope.postMessage({
      type: "failure",
      requestId: request.requestId,
      message:
        error instanceof Error
          ? error.message
          : "Vector geometry worker failed",
    });
  }
};
