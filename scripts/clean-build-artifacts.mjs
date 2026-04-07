import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const buildArtifactPaths = [
  "sdk/dist",
  "sdk/tsconfig.tsbuildinfo",
  "create-mdan/dist",
  "create-mdan/tsconfig.tsbuildinfo",
  "docs-site/dist",
  "docs-site/tsconfig.tsbuildinfo",
  "demo/agent-tasks/dist",
  "demo/agent-tasks/tsconfig.tsbuildinfo",
  "examples/auth-session/dist",
  "examples/auth-session/tsconfig.tsbuildinfo",
  "examples/docs-starter/dist",
  "examples/docs-starter/tsconfig.tsbuildinfo",
  "examples/express-starter/dist",
  "examples/express-starter/tsconfig.tsbuildinfo",
  "examples/guestbook/dist",
  "examples/guestbook/tsconfig.tsbuildinfo",
  "examples/marked-starter/dist",
  "examples/marked-starter/tsconfig.tsbuildinfo",
  "examples/react-starter/dist",
  "examples/react-starter/tsconfig.tsbuildinfo",
  "examples/starter/dist",
  "examples/starter/tsconfig.tsbuildinfo",
  "examples/vue-starter/dist",
  "examples/vue-starter/tsconfig.tsbuildinfo"
];

export async function cleanBuildArtifacts(rootDir = process.cwd()) {
  await Promise.all(
    buildArtifactPaths.map((artifactPath) => rm(resolve(rootDir, artifactPath), { recursive: true, force: true }))
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await cleanBuildArtifacts();
}
