import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

function readArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Usage: prepare-npm-package --package <dir> --readme <file> [--license <file>] [--restore true]");
    }
    args.set(key.slice(2), value);
  }
  return args;
}

async function backupAndCopy(packageDir, sourcePath, targetName, backupDir) {
  const targetPath = join(packageDir, targetName);
  const backupPath = join(backupDir, targetName);
  const existed = existsSync(targetPath);
  await writeFile(join(backupDir, `${targetName}.state`), existed ? "present" : "missing", "utf8");
  if (existed) {
    await cp(targetPath, backupPath);
  }
  if (resolve(sourcePath) === resolve(targetPath)) {
    return;
  }
  await cp(sourcePath, targetPath);
}

async function restoreTarget(packageDir, targetName, backupDir) {
  const targetPath = join(packageDir, targetName);
  const backupPath = join(backupDir, targetName);
  const statePath = join(backupDir, `${targetName}.state`);
  if (!existsSync(statePath)) {
    return;
  }
  const state = (await readFile(statePath, "utf8")).trim();
  if (state === "present") {
    await cp(backupPath, targetPath);
    return;
  }
  await rm(targetPath, { force: true });
}

const args = readArgs(process.argv.slice(2));
const packageDir = resolve(args.get("package") ?? ".");
const backupDir = join(packageDir, ".npm-pack-backup");
const restore = args.get("restore") === "true";

if (restore) {
  await restoreTarget(packageDir, "README.md", backupDir);
  await restoreTarget(packageDir, "LICENSE", backupDir);
  await rm(backupDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
} else {
  const readme = args.get("readme");
  if (!readme) {
    throw new Error("--readme is required");
  }
  await rm(backupDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await mkdir(backupDir, { recursive: true });
  await backupAndCopy(packageDir, resolve(packageDir, readme), "README.md", backupDir);
  const license = args.get("license");
  if (license) {
    await backupAndCopy(packageDir, resolve(packageDir, license), "LICENSE", backupDir);
  }
}
