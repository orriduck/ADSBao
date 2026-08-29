import type {
  ThreeOsmVectorContextGeometry,
  ThreeOsmVectorContextGeometryInput,
} from "./threeOsmVectorContextGeometry";

export type ThreeOsmVectorContextWorkerRequest = {
  type: "build";
  requestId: number;
  input: ThreeOsmVectorContextGeometryInput;
};

export type ThreeOsmVectorContextWorkerSuccess = {
  type: "success";
  requestId: number;
  geometry: ThreeOsmVectorContextGeometry;
  workerBuildMs: number;
};

export type ThreeOsmVectorContextWorkerFailure = {
  type: "failure";
  requestId: number;
  message: string;
};

export type ThreeOsmVectorContextWorkerResponse =
  | ThreeOsmVectorContextWorkerSuccess
  | ThreeOsmVectorContextWorkerFailure;

export type ThreeOsmVectorContextWorkerResult =
  ThreeOsmVectorContextWorkerSuccess & {
    roundTripMs: number;
  };
