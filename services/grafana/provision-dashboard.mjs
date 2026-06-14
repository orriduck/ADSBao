import fs from "node:fs";

const requiredEnv = [
  "GRAFANA_URL",
  "GRAFANA_BASIC_AUTH_USER",
  "GRAFANA_BASIC_AUTH_PASSWORD",
  "PROMETHEUS_URL",
  "PROMETHEUS_BASIC_AUTH_USER",
  "PROMETHEUS_BASIC_AUTH_PASSWORD",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const grafanaUrl = process.env.GRAFANA_URL.replace(/\/+$/, "");
const auth = Buffer.from(
  `${process.env.GRAFANA_BASIC_AUTH_USER}:${process.env.GRAFANA_BASIC_AUTH_PASSWORD}`,
).toString("base64");

async function grafana(path, init = {}) {
  const response = await fetch(`${grafanaUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok && response.status !== 409) {
    throw new Error(`${init.method || "GET"} ${path} -> ${response.status}: ${text}`);
  }
  return { body, status: response.status };
}

async function main() {
  const datasource = {
    name: "ADSBao Prometheus",
    uid: "adsbao-prometheus",
    type: "prometheus",
    access: "proxy",
    url: process.env.PROMETHEUS_URL,
    isDefault: true,
    basicAuth: true,
    basicAuthUser: process.env.PROMETHEUS_BASIC_AUTH_USER,
    secureJsonData: {
      basicAuthPassword: process.env.PROMETHEUS_BASIC_AUTH_PASSWORD,
    },
    jsonData: {
      httpMethod: "POST",
      timeInterval: "15s",
    },
  };

  const existingDatasource = await grafana(
    "/api/datasources/uid/adsbao-prometheus",
  ).catch((error) => {
    if (String(error.message).includes("-> 404:")) return null;
    throw error;
  });

  if (existingDatasource) {
    await grafana("/api/datasources/uid/adsbao-prometheus", {
      method: "PUT",
      body: JSON.stringify(datasource),
    });
  } else {
    await grafana("/api/datasources", {
      method: "POST",
      body: JSON.stringify(datasource),
    });
  }

  const folderUid = "adsbao";
  const existingFolder = await grafana(`/api/folders/${folderUid}`).catch((error) => {
    if (String(error.message).includes("-> 404:")) return null;
    throw error;
  });
  if (!existingFolder) {
    await grafana("/api/folders", {
      method: "POST",
      body: JSON.stringify({ title: "ADSBao", uid: folderUid }),
    });
  }

  const dashboard = JSON.parse(
    fs.readFileSync(
      new URL("./dashboards/adsbao-data-service-dashboard.json", import.meta.url),
      "utf8",
    ),
  );
  dashboard.id = null;

  await grafana("/api/dashboards/db", {
    method: "POST",
    body: JSON.stringify({
      dashboard,
      folderUid,
      overwrite: true,
    }),
  });

  const loaded = await grafana("/api/dashboards/uid/adsbao-data-service");
  console.log(
    JSON.stringify(
      {
        dashboardTitle: loaded.body.dashboard.title,
        dashboardUid: loaded.body.dashboard.uid,
        dashboardUrl: `${grafanaUrl}${loaded.body.meta.url}`,
        datasourceUid: "adsbao-prometheus",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
