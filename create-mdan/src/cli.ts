import { basename, resolve } from "node:path";

import {
  scaffoldStarterProject,
  toCompatibleSdkRange,
  type StarterRuntime
} from "./scaffold.js";

export interface ParsedCliArgs {
  targetArg: string | undefined;
  runtime: StarterRuntime;
  showHelp: boolean;
}

function isStarterRuntime(value: string): value is StarterRuntime {
  return value === "node" || value === "bun";
}

export function detectDefaultRuntime(userAgent = process.env.npm_config_user_agent ?? ""): StarterRuntime {
  return /\bbun\/\d/i.test(userAgent) ? "bun" : "node";
}

export function parseCliArgs(argv: string[], userAgent = process.env.npm_config_user_agent ?? ""): ParsedCliArgs {
  let targetArg: string | undefined;
  let runtime = detectDefaultRuntime(userAgent);
  let showHelp = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      showHelp = true;
      continue;
    }
    if (arg === "--runtime") {
      const next = argv[index + 1];
      if (!next || !isStarterRuntime(next)) {
        throw new Error('Expected "--runtime" to be followed by "node" or "bun".');
      }
      runtime = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("--runtime=")) {
      const value = arg.slice("--runtime=".length);
      if (!isStarterRuntime(value)) {
        throw new Error(`Unsupported runtime "${value}". Expected "node" or "bun".`);
      }
      runtime = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option "${arg}".`);
    }
    if (targetArg) {
      throw new Error(`Unexpected extra argument "${arg}".`);
    }
    targetArg = arg;
  }

  return { targetArg, runtime, showHelp };
}

export function formatUsage(): string {
  return [
    "Usage:",
    "  npm create mdan@latest <project-name>",
    "  npm create mdan@latest <project-name> -- --runtime bun",
    "  bunx create-mdan <project-name>",
    "  bunx create-mdan <project-name> --runtime node"
  ].join("\n");
}

export function formatNextSteps(projectDir: string, runtime: StarterRuntime, targetArg = projectDir): string {
  const installCommand = runtime === "bun" ? "bun install" : "npm install";
  const startCommand = runtime === "bun" ? "bun start" : "npm start";
  return [
    `Created MDAN ${runtime} starter in ${projectDir}`,
    "",
    "Next steps:",
    `  cd ${targetArg}`,
    "",
    `  ${installCommand}`,
    `  ${startCommand}`
  ].join("\n");
}

export async function runCli(argv: string[], packageVersion: string): Promise<string | null> {
  const { targetArg, runtime, showHelp } = parseCliArgs(argv);
  if (!targetArg || showHelp) {
    return formatUsage();
  }

  const targetDir = resolve(process.cwd(), targetArg);
  const projectName = targetArg === "." ? undefined : basename(targetDir);
  const projectDir = await scaffoldStarterProject({
    targetDir,
    sdkVersion: toCompatibleSdkRange(packageVersion),
    runtime,
    ...(projectName ? { projectName } : {})
  });
  return formatNextSteps(projectDir, runtime, targetArg);
}
