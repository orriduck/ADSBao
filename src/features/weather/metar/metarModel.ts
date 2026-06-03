export function normalizeMetarPayload(payload) {
  const metar = Array.isArray(payload) ? payload[0] : payload;
  if (!metar) return { raw: "", parsed: null };

  return {
    raw: metar.rawOb || metar.rawMETAR || "",
    parsed: {
      wind: formatWind(metar),
      vis: metar.visib ? `${metar.visib} SM` : "-",
      temp: metar.temp != null ? `${metar.temp}°C` : "-",
      dew: metar.dewp != null ? `${metar.dewp}°C` : "-",
      altim: metar.altim ? `${metar.altim} inHg` : "-",
      ceiling: formatCeiling(metar),
      wxString: metar.wxString || "",
      flightCategory: metar.flightCategory || metar.fltCat || "",
      obsTime: metar.obsTime || "",
      rawTemp: metar.temp ?? null,
      rawDewp: metar.dewp ?? null,
      rawVisib: metar.visib != null ? Number(metar.visib) : null,
      rawAltim: metar.altim != null ? Number(metar.altim) : null,
      rawWspd: metar.wspd ?? null,
      rawWgst: metar.wgst ?? null,
      rawClouds: Array.isArray(metar.clouds) ? metar.clouds : [],
      rawWdir:
        metar.wdir === "VRB"
          ? null
          : metar.wdir != null
            ? Number(metar.wdir)
            : null,
      rawWvrb: metar.wdir === "VRB",
    },
  };
}

function formatWind(metar) {
  if (!metar.wdir && !metar.wspd) return "-";
  const direction =
    metar.wdir === "VRB"
      ? "VRB"
      : `${String(metar.wdir ?? 0).padStart(3, "0")}°`;
  const speed = `${metar.wspd ?? 0} kt`;
  return metar.wgst ? `${direction} / ${speed} G${metar.wgst}kt` : `${direction} / ${speed}`;
}

function formatCeiling(metar) {
  const layers = metar.clouds || [];
  const ceiling = layers.find((layer) =>
    ["BKN", "OVC", "VV"].includes(layer.cover),
  );
  if (!ceiling) return "CLR";
  const feet =
    ceiling.base != null
      ? `${Number(ceiling.base).toLocaleString()} ft`
      : "?";
  return `${ceiling.cover} ${feet}`;
}
