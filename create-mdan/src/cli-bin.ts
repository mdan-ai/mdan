#!/usr/bin/env node
import packageJson from "../package.json" with { type: "json" };

import { runCli } from "./cli.js";

try {
  const message = await runCli(process.argv.slice(2), packageJson.version);
  if (message) {
    console.log(message);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
