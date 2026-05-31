import {
  normalizeFeatureFlags,
  normalizeFeatureFlagEnvironment,
  normalizeUserEmail,
} from "../src/features/app-shell/feature-flags/userFeatureFlagsModel";

type FeatureFlagEnvironment = "local" | "preview" | "production";
type FeatureFlags = Record<string, boolean>;

type FeatureFlagCommand =
  | { action: "get"; email: string; environment: FeatureFlagEnvironment }
  | {
      action: "set";
      email: string;
      environment: FeatureFlagEnvironment;
      flagKey: string;
      flagValue: boolean;
    }
  | {
      action: "merge";
      email: string;
      environment: FeatureFlagEnvironment;
      flags: FeatureFlags;
    }
  | {
      action: "clear-flag";
      email: string;
      environment: FeatureFlagEnvironment;
      flagKey: string;
    }
  | { action: "clear-user"; email: string; environment: FeatureFlagEnvironment };

type FeatureFlagRepository = {
  readFlagsByEmail?: (
    email: string,
    options: { environment: FeatureFlagEnvironment },
  ) => Promise<{ flags?: unknown } | null | undefined>;
  upsertFlagsByEmail?: (entity: {
    email: string;
    environment: FeatureFlagEnvironment;
    flags: FeatureFlags;
  }) => Promise<unknown>;
  deleteFlagsByEmail?: (
    email: string,
    options: { environment: FeatureFlagEnvironment },
  ) => Promise<unknown>;
};

type ApplyFeatureFlagCommandOptions = {
  command?: FeatureFlagCommand;
  repository?: FeatureFlagRepository;
};

const TRUTHY_VALUES = new Set(["1", "true", "on", "yes", "enable", "enabled"]);
const FALSY_VALUES = new Set(["0", "false", "off", "no", "disable", "disabled"]);

export function parseBooleanFlagValue(value: unknown): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) return true;
  if (FALSY_VALUES.has(normalized)) return false;
  throw new Error(`Expected boolean value, got "${value}"`);
}

function extractEnvironmentOption(args: unknown[] = []) {
  const nextArgs: unknown[] = [];
  let environment: unknown = "local";

  for (let index = 0; index < args.length; index++) {
    const value = String(args[index] || "");
    if (value === "--env" || value === "-e") {
      environment = args[index + 1];
      index++;
      continue;
    }
    if (value.startsWith("--env=")) {
      environment = value.slice("--env=".length);
      continue;
    }
    nextArgs.push(args[index]);
  }

  return {
    args: nextArgs,
    environment: normalizeFeatureFlagEnvironment(environment) as FeatureFlagEnvironment,
  };
}

export function parseFeatureFlagCommand(args: unknown[] = []): FeatureFlagCommand {
  const {
    args: positionalArgs,
    environment,
  } = extractEnvironmentOption(args);
  const [rawAction, rawEmail, rawFlagKey, rawValue] = positionalArgs;
  const action = String(rawAction || "").trim().toLowerCase();
  const email = normalizeUserEmail(rawEmail);
  if (!action || !email) {
    throw new Error("Usage: pnpm ff [--env local|preview|production] <get|set|merge|clear> <email> ...");
  }

  if (action === "get") {
    return { action: "get", email, environment };
  }

  if (action === "set") {
    const flagKey = String(rawFlagKey || "").trim();
    if (!flagKey || rawValue === undefined) {
      throw new Error("Usage: pnpm ff set <email> <flag> <on|off>");
    }
    return {
      action: "set",
      email,
      environment,
      flagKey,
      flagValue: parseBooleanFlagValue(rawValue),
    };
  }

  if (action === "merge") {
    if (!rawFlagKey) {
      throw new Error("Usage: pnpm ff merge <email> '<json-flags>'");
    }
    return {
      action: "merge",
      email,
      environment,
      flags: normalizeFeatureFlags(JSON.parse(String(rawFlagKey))) as FeatureFlags,
    };
  }

  if (action === "clear") {
    const flagKey = String(rawFlagKey || "").trim();
    if (flagKey) return { action: "clear-flag", email, environment, flagKey };
    return { action: "clear-user", email, environment };
  }

  throw new Error(`Unknown feature flag command "${rawAction}"`);
}

export async function applyFeatureFlagCommand({
  command,
  repository,
}: ApplyFeatureFlagCommandOptions = {}): Promise<any> {
  if (!command || !repository) {
    throw new Error("Feature flag command and repository are required");
  }

  if (command.action === "get") {
    const row = await repository.readFlagsByEmail!(command.email, {
      environment: command.environment,
    });
    return {
      email: command.email,
      environment: command.environment,
      flags: normalizeFeatureFlags(row?.flags),
    };
  }

  if (command.action === "set") {
    const row = await repository.readFlagsByEmail!(command.email, {
      environment: command.environment,
    });
    const flags = {
      ...normalizeFeatureFlags(row?.flags),
      [command.flagKey]: command.flagValue,
    };
    return repository.upsertFlagsByEmail!({
      email: command.email,
      environment: command.environment,
      flags,
    });
  }

  if (command.action === "merge") {
    const row = await repository.readFlagsByEmail!(command.email, {
      environment: command.environment,
    });
    const flags = {
      ...normalizeFeatureFlags(row?.flags),
      ...normalizeFeatureFlags(command.flags),
    };
    return repository.upsertFlagsByEmail!({
      email: command.email,
      environment: command.environment,
      flags,
    });
  }

  if (command.action === "clear-flag") {
    const row = await repository.readFlagsByEmail!(command.email, {
      environment: command.environment,
    });
    const flags = { ...normalizeFeatureFlags(row?.flags) };
    delete flags[command.flagKey];
    if (Object.keys(flags).length === 0) {
      await repository.deleteFlagsByEmail!(command.email, {
        environment: command.environment,
      });
      return { email: command.email, environment: command.environment, flags: {} };
    }
    return repository.upsertFlagsByEmail!({
      email: command.email,
      environment: command.environment,
      flags,
    });
  }

  if (command.action === "clear-user") {
    await repository.deleteFlagsByEmail!(command.email, {
      environment: command.environment,
    });
    return { email: command.email, environment: command.environment, flags: {} };
  }

  throw new Error(
    `Unsupported feature flag action "${(command as { action?: string }).action}"`,
  );
}
