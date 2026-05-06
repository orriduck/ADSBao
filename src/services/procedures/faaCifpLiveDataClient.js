import { unzipSync, strFromU8 } from "fflate";
import { FAA_CIFP_CONFIG } from "../../config/aviation.js";
import {
  buildLiveProcedurePayload,
  discoverActiveCifpRelease,
} from "./faaCifpLiveDataModel.js";

let cachedCifp = null;

const assertOk = (response, label) => {
  if (!response.ok) {
    throw new Error(`FAA CIFP ${label} failed: HTTP ${response.status}`);
  }
};

export function extractFaaCifpTextFromZip(arrayBuffer) {
  const files = unzipSync(new Uint8Array(arrayBuffer));
  const cifp = files.FAACIFP18;
  if (!cifp) throw new Error("FAA CIFP zip did not include FAACIFP18");
  return strFromU8(cifp);
}

async function fetchActiveCifpText({
  fetchImpl,
  now = new Date(),
  downloadPageUrl = FAA_CIFP_CONFIG.downloadPageUrl,
}) {
  const pageResponse = await fetchImpl(downloadPageUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": FAA_CIFP_CONFIG.userAgent,
    },
    next: {
      revalidate: Math.floor(FAA_CIFP_CONFIG.cacheMs / 1000),
    },
  });
  assertOk(pageResponse, "download page fetch");

  const html = await pageResponse.text();
  const release = discoverActiveCifpRelease({
    html,
    now,
    pageUrl: downloadPageUrl,
  });

  const zipResponse = await fetchImpl(release.url, {
    headers: {
      Accept: "application/zip,application/octet-stream",
      "User-Agent": FAA_CIFP_CONFIG.userAgent,
    },
    next: {
      revalidate: Math.floor(FAA_CIFP_CONFIG.cacheMs / 1000),
    },
  });
  assertOk(zipResponse, `zip fetch for ${release.cycle}`);

  return {
    release,
    text: extractFaaCifpTextFromZip(await zipResponse.arrayBuffer()),
  };
}

export async function getCachedActiveCifp({
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const currentTime = now.getTime();
  if (cachedCifp && cachedCifp.expiresAt > currentTime) {
    return cachedCifp.promise;
  }

  const promise = fetchActiveCifpText({ fetchImpl, now });
  cachedCifp = {
    expiresAt: currentTime + FAA_CIFP_CONFIG.cacheMs,
    promise,
  };

  try {
    return await promise;
  } catch (error) {
    if (cachedCifp?.promise === promise) cachedCifp = null;
    throw error;
  }
}

export async function buildLiveAirportProcedurePayload({
  airport,
  fetchImpl = fetch,
  now = new Date(),
  maxProcedures = FAA_CIFP_CONFIG.maxProceduresPerAirport,
} = {}) {
  const { release, text } = await getCachedActiveCifp({ fetchImpl, now });
  return buildLiveProcedurePayload({
    lines: text.split(/\r?\n/).filter(Boolean),
    airport,
    cycle: release.cycle,
    maxProcedures,
  });
}
