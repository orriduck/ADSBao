import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

type EndpointCheck = {
  name: string;
  url: string;
  ok: boolean;
  ms: number;
  status?: number;
  summary: string;
};

type ProcessState = {
  port: number;
  pids: number[];
  commands: string[];
};

type Options = {
  json: boolean;
  noStart: boolean;
  restart: boolean;
  service: boolean;
  serviceRestart: boolean;
};

const rootDir = process.cwd();
const tmpDir = join(rootDir, ".codex-tmp", "local-debug");
const vitePort = 3000;
const viteSession = "adsbao-dev";
const serviceSession = "adsbao-data-service";
const dotenvEnv = loadDotenvFile(join(rootDir, ".env.local"));
const env = { ...dotenvEnv, ...process.env };
const localApiOrigin =
  env.VITE_ADSBAO_LOCAL_API_ORIGIN ||
  env.ADSBAO_LOCAL_API_ORIGIN ||
  "http://localhost:8081";
const localApiPort = parsePort(localApiOrigin, 8081);
const viteOrigin = env.ADSBAO_LOCAL_DEV_ORIGIN || `http://localhost:${vitePort}`;

function printUsage() {
  console.log(`Usage:
  pnpm debug:local [--restart] [--no-start] [--service] [--service-restart] [--json]

Examples:
  pnpm debug:local
  pnpm debug:local --service
  pnpm debug:local --restart
  pnpm debug:local:status
  pnpm debug:local:service`);
}

function parseOptions(args: string[]): Options {
  const options: Options = {
    json: false,
    noStart: false,
    restart: false,
    service: false,
    serviceRestart: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--":
        break;
      case "--json":
        options.json = true;
        break;
      case "--no-start":
      case "--status":
        options.noStart = true;
        break;
      case "--restart":
        options.restart = true;
        break;
      case "--service":
        options.service = true;
        break;
      case "--service-restart":
        options.service = true;
        options.serviceRestart = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function loadDotenvFile(path: string) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex < 0) return [line, ""];
        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function parsePort(origin: string, fallback: number) {
  try {
    const parsed = new URL(origin);
    if (parsed.port) return Number(parsed.port);
    return parsed.protocol === "https:" ? 443 : 80;
  } catch (_error) {
    return fallback;
  }
}

function run(command: string, args: string[], cwd = rootDir) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

function commandPath(command: string, fallbacks: string[]) {
  for (const fallback of fallbacks) {
    if (existsSync(fallback)) return fallback;
  }
  const result = run("which", [command]);
  const path = result.stdout.trim().split(/\r?\n/)[0];
  return path || command;
}

function commandWorks(command: string, args: string[] = ["--version"]) {
  const result = run(command, args);
  return result.status === 0;
}

function ensureRepoRoot() {
  const packagePath = join(rootDir, "package.json");
  if (!existsSync(packagePath)) {
    throw new Error("Run this command from the ADSBao repository root.");
  }

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  if (packageJson.name !== "adsbao") {
    throw new Error("Run this command from the ADSBao repository root.");
  }
}

function portState(port: number): ProcessState {
  const result = run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
  const pids = result.stdout
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (pids.length === 0) {
    return { port, pids: [], commands: [] };
  }

  const ps = run("ps", ["-p", pids.join(","), "-o", "pid=,command="]);
  const commands = ps.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return { port, pids, commands };
}

function killPort(port: number) {
  const state = portState(port);
  for (const pid of state.pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (_error) {}
  }
}

async function waitForPortFree(port: number, timeoutMs = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (portState(port).pids.length === 0) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return portState(port).pids.length === 0;
}

function killTmuxSession(name: string) {
  run("tmux", ["kill-session", "-t", name]);
}

function tmuxAvailable() {
  return commandWorks("tmux", ["-V"]);
}

function startWithTmux({
  command,
  cwd,
  envValues,
  logFile,
  session,
}: {
  command: string;
  cwd: string;
  envValues: Record<string, string | undefined>;
  logFile: string;
  session: string;
}) {
  const args = ["new-session", "-d", "-s", session, "-c", cwd];
  for (const [key, value] of Object.entries(envValues)) {
    if (value !== undefined) args.push("-e", `${key}=${value}`);
  }
  args.push(`${command} 2>&1 | tee -a ${shellQuote(logFile)}`);
  const result = run("tmux", args, cwd);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `tmux failed to start ${session}`);
  }
}

function startDetached({
  command,
  args,
  cwd,
  envValues,
  logFile,
  pidFile,
}: {
  command: string;
  args: string[];
  cwd: string;
  envValues: Record<string, string | undefined>;
  logFile: string;
  pidFile: string;
}) {
  const fd = openSync(logFile, "a");
  const child = spawn(command, args, {
    cwd,
    detached: true,
    env: {
      ...process.env,
      ...Object.fromEntries(
        Object.entries(envValues).filter((entry): entry is [string, string] =>
          entry[1] !== undefined,
        ),
      ),
    },
    stdio: ["ignore", fd, fd],
  });
  child.unref();
  closeSync(fd);
  writeFileSync(pidFile, `${child.pid}\n`);
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function localServiceEnv(port: number) {
  return {
    ...pickEnv(env, [
      "ADSBAO_DATABASE_URL",
      "ADSBAO_REALTIME_AUTH_SECRET",
      "AIRPORT_DIRECTORY_BASE_URL",
      "ALLOWED_WS_ORIGINS",
      "CLERK_API_BASE_URL",
      "CLERK_JWKS_URL",
      "CLERK_SECRET_KEY",
      "DATABASE_URL",
      "FLIGHTAWARE_ACCESS_ENABLED",
      "FLIGHTAWARE_FALLBACK_ENABLED",
      "OPENAIP_API_KEY",
      "OPENAIP_BASE_URL",
      "VITE_SITE_URL",
    ]),
    ADSBAO_SITE_URL: env.ADSBAO_SITE_URL || viteOrigin,
    FEATURE_FLAGS_ENV: env.FEATURE_FLAGS_ENV || "local",
    PORT: String(port),
  };
}

function pickEnv(source: Record<string, string | undefined>, keys: string[]) {
  return Object.fromEntries(
    keys
      .map((key) => [key, source[key]] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
}

async function checkEndpoint(
  name: string,
  url: string,
  timeoutMs = 2500,
): Promise<EndpointCheck> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      name,
      url,
      ok: response.status >= 200 && response.status < 400,
      ms: Date.now() - started,
      status: response.status,
      summary: summarizeBody(body, response.headers.get("content-type") || ""),
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      ms: Date.now() - started,
      summary: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeBody(body: string, contentType: string) {
  const trimmed = body.trim();
  if (!trimmed) return "empty body";

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.channels)) {
        return `${parsed.channels.length} channels`;
      }
      if (parsed.flags && typeof parsed.flags === "object") {
        return `flags: ${Object.keys(parsed.flags).join(", ") || "none"}`;
      }
      if (typeof parsed.ok === "boolean") {
        return `ok=${parsed.ok} service=${parsed.service || "unknown"} activeChannels=${parsed.activeChannels ?? "n/a"}`;
      }
      return Object.keys(parsed).slice(0, 6).join(", ");
    } catch (_error) {}
  }

  const titleMatch = trimmed.match(/<title>(.*?)<\/title>/is);
  if (titleMatch) return `title: ${titleMatch[1].replace(/\s+/g, " ").trim()}`;
  return trimmed.replace(/\s+/g, " ").slice(0, 120);
}

async function waitForHealthy(url: string, timeoutMs = 45000) {
  const started = Date.now();
  let last: EndpointCheck | undefined;

  while (Date.now() - started < timeoutMs) {
    last = await checkEndpoint("wait", url, 1800);
    if (last.ok) return last;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1200));
  }

  return last;
}

function startVite() {
  mkdirSync(tmpDir, { recursive: true });
  const pnpm = commandPath("pnpm", [
    "/opt/homebrew/bin/pnpm",
    "/usr/local/bin/pnpm",
  ]);
  const logFile = join(tmpDir, "vite.log");
  if (tmuxAvailable()) {
    killTmuxSession(viteSession);
    startWithTmux({
      command: `${shellQuote(pnpm)} run dev`,
      cwd: rootDir,
      envValues: {},
      logFile,
      session: viteSession,
    });
    return { method: `tmux:${viteSession}`, logFile };
  }

  const pidFile = join(tmpDir, "vite.pid");
  startDetached({
    command: pnpm,
    args: ["run", "dev"],
    cwd: rootDir,
    envValues: {},
    logFile,
    pidFile,
  });
  return { method: "detached", logFile };
}

function startService() {
  mkdirSync(tmpDir, { recursive: true });
  const go = commandPath("go", ["/opt/homebrew/bin/go", "/usr/local/bin/go"]);
  const serviceDir = join(rootDir, "services", "data-service");
  const logFile = join(tmpDir, "data-service.log");
  const envValues = localServiceEnv(localApiPort);

  if (tmuxAvailable()) {
    killTmuxSession(serviceSession);
    startWithTmux({
      command: `${shellQuote(go)} run ./cmd/adsbao-data-service`,
      cwd: serviceDir,
      envValues,
      logFile,
      session: serviceSession,
    });
    return { method: `tmux:${serviceSession}`, logFile };
  }

  const pidFile = join(tmpDir, "data-service.pid");
  startDetached({
    command: go,
    args: ["run", "./cmd/adsbao-data-service"],
    cwd: serviceDir,
    envValues,
    logFile,
    pidFile,
  });
  return { method: "detached", logFile };
}

async function ensureFrontend(options: Options) {
  if (options.restart) {
    killPort(vitePort);
    killTmuxSession(viteSession);
    await waitForPortFree(vitePort);
  }

  const initial = await checkEndpoint("frontend root", viteOrigin);
  if (initial.ok || options.noStart) {
    return { action: initial.ok ? "adopted" : "not started", start: null };
  }

  const state = portState(vitePort);
  if (state.pids.length > 0) {
    killPort(vitePort);
    killTmuxSession(viteSession);
    await waitForPortFree(vitePort);
  }

  const start = startVite();
  const ready = await waitForHealthy(viteOrigin);
  if (!ready?.ok) {
    throw new Error(`Vite did not become healthy. See ${start.logFile}`);
  }
  return { action: "started", start };
}

async function ensureService(options: Options) {
  if (!options.service) return { action: "skipped", start: null };

  if (options.serviceRestart) {
    killPort(localApiPort);
    killTmuxSession(serviceSession);
    await waitForPortFree(localApiPort);
  }

  const healthUrl = `${localApiOrigin}/health`;
  const initial = await checkEndpoint("data-service health", healthUrl);
  if (initial.ok || options.noStart) {
    return { action: initial.ok ? "adopted" : "not started", start: null };
  }

  const state = portState(localApiPort);
  if (state.pids.length > 0) {
    killPort(localApiPort);
    killTmuxSession(serviceSession);
    await waitForPortFree(localApiPort);
  }

  const start = startService();
  const ready = await waitForHealthy(healthUrl);
  if (!ready?.ok) {
    throw new Error(`data-service did not become healthy. See ${start.logFile}`);
  }
  return { action: "started", start };
}

async function buildSnapshot(frontendAction: unknown, serviceAction: unknown) {
  const endpoints = await Promise.all([
    checkEndpoint("frontend /", `${viteOrigin}/`),
    checkEndpoint("frontend KBOS", `${viteOrigin}/airport/KBOS?locale=zh-CN`),
    checkEndpoint("frontend /health proxy", `${viteOrigin}/health`),
    checkEndpoint("frontend /api/feature-flags proxy", `${viteOrigin}/api/feature-flags`),
    checkEndpoint("frontend /debug/channels proxy", `${viteOrigin}/debug/channels`),
    checkEndpoint("data-service /health", `${localApiOrigin}/health`),
    checkEndpoint("data-service /api/feature-flags", `${localApiOrigin}/api/feature-flags`),
    checkEndpoint("data-service /debug/channels", `${localApiOrigin}/debug/channels`),
  ]);

  const git = gitSnapshot();
  const report = {
    generatedAt: new Date().toISOString(),
    rootDir,
    viteOrigin,
    localApiOrigin,
    git,
    frontend: {
      action: frontendAction,
      process: portState(vitePort),
    },
    service: {
      action: serviceAction,
      process: portState(localApiPort),
    },
    endpoints,
  };

  writeSnapshot(report);
  return report;
}

function gitSnapshot() {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
  const sha = run("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
  const status = run("git", ["status", "--short"]).stdout.trim();
  return {
    branch,
    sha,
    dirty: status.length > 0,
  };
}

function writeSnapshot(report: any) {
  mkdirSync(tmpDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const json = JSON.stringify(report, null, 2);
  writeFileSync(join(tmpDir, "latest.json"), `${json}\n`);
  writeFileSync(join(tmpDir, `${stamp}.json`), `${json}\n`);
  writeFileSync(join(tmpDir, "latest.md"), renderMarkdown(report));
}

function renderMarkdown(report: any) {
  const lines = [
    `# ADSBao local debug snapshot`,
    ``,
    `- generated: ${report.generatedAt}`,
    `- git: ${report.git.branch}@${report.git.sha}${report.git.dirty ? " dirty" : ""}`,
    `- frontend: ${report.viteOrigin}`,
    `- local API origin: ${report.localApiOrigin}`,
    ``,
    `| check | status | ok | ms | summary |`,
    `|---|---:|---:|---:|---|`,
  ];

  for (const endpoint of report.endpoints as EndpointCheck[]) {
    lines.push(
      `| ${endpoint.name} | ${endpoint.status ?? ""} | ${endpoint.ok ? "yes" : "no"} | ${endpoint.ms} | ${endpoint.summary.replace(/\|/g, "\\|")} |`,
    );
  }

  lines.push("", "");
  return lines.join("\n");
}

function printReport(report: any) {
  console.log("ADSBao local debug");
  console.log(
    `- git: ${report.git.branch}@${report.git.sha}${report.git.dirty ? " dirty" : ""}`,
  );
  console.log(`- frontend: ${report.viteOrigin}`);
  console.log(`- local API origin: ${report.localApiOrigin}`);
  console.log(`- snapshot: ${relative(rootDir, join(tmpDir, "latest.md"))}`);
  console.log("");

  for (const endpoint of report.endpoints as EndpointCheck[]) {
    const status = endpoint.status ? String(endpoint.status) : "ERR";
    const marker = endpoint.ok ? "ok" : "fail";
    console.log(
      `${marker.padEnd(4)} ${status.padEnd(3)} ${endpoint.ms.toString().padStart(4)}ms ${endpoint.name} - ${endpoint.summary}`,
    );
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  ensureRepoRoot();

  const frontendAction = await ensureFrontend(options);
  const serviceAction = await ensureService(options);
  const report = await buildSnapshot(frontendAction, serviceAction);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  const frontendHealthy = report.endpoints.find(
    (endpoint: EndpointCheck) => endpoint.name === "frontend /",
  )?.ok;
  const serviceHealthy = options.service
    ? report.endpoints.find(
        (endpoint: EndpointCheck) => endpoint.name === "data-service /health",
      )?.ok
    : true;

  if (!frontendHealthy || !serviceHealthy) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
