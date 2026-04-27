import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const buildOutputPaths = [
  "dist",
  "dist-browser",
  "create-mdan/dist"
];

await Promise.all(
  buildOutputPaths.map((path) =>
    rm(resolve(path), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  )
);
