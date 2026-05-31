import { unzipSync, strFromU8 } from "fflate";
import { PROCEDURE_DATA_CONFIG } from "../../../config/aviation";
import { readResponseArrayBuffer } from "../../../app/api/_shared/apiProxySecurity";
import {
  buildLiveProcedurePayload,
  discoverActiveProcedureRelease,
} from "./procedureSourceModel";
import { buildRunwayProcedurePayload } from "./runwayProcedureModel";

let cachedProcedureSource = null;

const assertOk = (response, label) => {
  if (!response.ok) {
    throw new Error(`Procedure source ${label} failed: HTTP ${response.status}`);
  }
};

export function extractProcedureTextFromZip(
  arrayBuffer,
  { maxBytes = PROCEDURE_DATA_CONFIG.maxCifpBytes } = {},
) {
  const files = unzipSync(new Uint8Array(arrayBuffer));
  const fileNames = Object.keys(files);
  if (fileNames.length > 8) {
    throw new Error("Procedure source zip included too many files");
  }
  for (const fileName of fileNames) {
    if (!/^[A-Za-z0-9 ._-]{1,160}$/.test(fileName)) {
      throw new Error(
        `Procedure source zip included an unexpected file: ${fileName}`,
      );
    }
  }

  const payload = files.FAACIFP18;
  if (!payload) throw new Error("Procedure source zip did not include FAACIFP18");
  if (payload.byteLength > maxBytes) {
    throw new Error("Procedure source data exceeded the configured size limit");
  }
  return strFromU8(payload);
}

async function fetchActiveProcedureText({
  fetchImpl,
  now = new Date(),
  downloadPageUrl = PROCEDURE_DATA_CONFIG.downloadPageUrl,
}) {
  const pageResponse = await fetchImpl(downloadPageUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": PROCEDURE_DATA_CONFIG.userAgent,
    },
    next: {
      revalidate: Math.floor(PROCEDURE_DATA_CONFIG.cacheMs / 1000),
    },
  });
  assertOk(pageResponse, "download page fetch");

  const html = await pageResponse.text();
  const release = discoverActiveProcedureRelease({
    html,
    now,
    pageUrl: downloadPageUrl,
  });

  const zipResponse = await fetchImpl(release.url, {
    headers: {
      Accept: "application/zip,application/octet-stream",
      "User-Agent": PROCEDURE_DATA_CONFIG.userAgent,
    },
    next: {
      revalidate: Math.floor(PROCEDURE_DATA_CONFIG.cacheMs / 1000),
    },
  });
  assertOk(zipResponse, `zip fetch for ${release.cycle}`);

  return {
    release,
    text: extractProcedureTextFromZip(
      await readResponseArrayBuffer(zipResponse, {
        label: `Procedure source zip for ${release.cycle}`,
        maxBytes: PROCEDURE_DATA_CONFIG.maxZipBytes,
      }),
    ),
  };
}

export async function getCachedActiveProcedureSource({
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const currentTime = now.getTime();
  if (cachedProcedureSource && cachedProcedureSource.expiresAt > currentTime) {
    return cachedProcedureSource.promise;
  }

  const promise = fetchActiveProcedureText({ fetchImpl, now });
  cachedProcedureSource = {
    expiresAt: currentTime + PROCEDURE_DATA_CONFIG.cacheMs,
    promise,
  };

  try {
    return await promise;
  } catch (error) {
    if (cachedProcedureSource?.promise === promise) cachedProcedureSource = null;
    throw error;
  }
}

export async function buildLiveAirportProcedurePayload({
  airport,
  fetchImpl = fetch,
  now = new Date(),
  maxProcedures = PROCEDURE_DATA_CONFIG.maxProceduresPerAirport,
} = {}) {
  const { release, text } = await getCachedActiveProcedureSource({
    fetchImpl,
    now,
  });
  return buildLiveProcedurePayload({
    lines: text.split(/\r?\n/).filter(Boolean),
    airport,
    cycle: release.cycle,
    maxProcedures,
  });
}

export async function buildLiveAirportRunwayProcedurePayload({
  airport,
  fetchImpl = fetch,
  now = new Date(),
  maxProcedures = PROCEDURE_DATA_CONFIG.maxProceduresPerAirport,
} = {}) {
  const { release, text } = await getCachedActiveProcedureSource({
    fetchImpl,
    now,
  });
  return buildRunwayProcedurePayload({
    lines: text.split(/\r?\n/).filter(Boolean),
    airport,
    cycle: release.cycle,
    maxProcedures,
  });
}
