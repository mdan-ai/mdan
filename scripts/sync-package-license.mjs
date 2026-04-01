import { copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = process.cwd();
const rootLicense = resolve(packageRoot, "..", "LICENSE");
const packageLicense = resolve(packageRoot, "LICENSE");
const cleanup = process.argv.includes("--cleanup");

if (cleanup) {
  await rm(packageLicense, { force: true });
} else {
  await copyFile(rootLicense, packageLicense);
}
