import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function loadPackageJson() {
  return JSON.parse(await readFile("package.json", "utf8"));
}

function removeOverride(packageJson, dependency) {
  const candidate = structuredClone(packageJson);
  delete candidate.overrides[dependency];

  if (Object.keys(candidate.overrides).length === 0) {
    delete candidate.overrides;
  }

  return candidate;
}

async function createCandidateProject(packageJson, dependency) {
  const directory = await mkdtemp(join(tmpdir(), "hackerfeed-override-"));
  const candidate = removeOverride(packageJson, dependency);

  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify(candidate, null, 2)}\n`,
  );
  await cp("bun.lock", join(directory, "bun.lock"));

  return directory;
}

function refreshCandidateLockfile(directory) {
  const result = Bun.spawnSync(
    ["bun", "install", "--lockfile-only", "--ignore-scripts"],
    { cwd: directory, stdout: "ignore", stderr: "pipe" },
  );

  if (!result.success) {
    throw new Error(new TextDecoder().decode(result.stderr));
  }
}

function candidatePassesSecurityAudit(directory) {
  return Bun.spawnSync(["bun", "audit", "--audit-level=high"], {
    cwd: directory,
    stdout: "ignore",
    stderr: "ignore",
  }).success;
}

async function isOverrideRedundant(packageJson, dependency) {
  const directory = await createCandidateProject(packageJson, dependency);

  try {
    refreshCandidateLockfile(directory);
    return candidatePassesSecurityAudit(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function findRedundantOverrides(packageJson) {
  const overrides = Object.keys(packageJson.overrides ?? {});
  const checks = overrides.map(async (dependency) => ({
    dependency,
    redundant: await isOverrideRedundant(packageJson, dependency),
  }));
  const results = await Promise.all(checks);

  return results
    .filter(({ redundant }) => redundant)
    .map(({ dependency }) => dependency);
}

function reportResults(overrideCount, redundantOverrides) {
  if (redundantOverrides.length === 0) {
    console.log(
      `Checked ${overrideCount} security override(s); all are required.`,
    );
    return;
  }

  console.error(
    `Redundant security overrides: ${redundantOverrides.join(", ")}. Remove them and regenerate bun.lock.`,
  );
  process.exit(1);
}

async function writePackageJson(packageJson) {
  await writeFile("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
}

function refreshProjectLockfile() {
  const result = Bun.spawnSync(
    ["bun", "install", "--lockfile-only", "--ignore-scripts"],
    { stdout: "inherit", stderr: "inherit" },
  );

  if (!result.success) {
    throw new Error("Could not refresh bun.lock after pruning overrides.");
  }
}

async function pruneOverrides(packageJson, redundantOverrides) {
  const prunedPackageJson = redundantOverrides.reduce(
    removeOverride,
    packageJson,
  );

  await writePackageJson(prunedPackageJson);
  refreshProjectLockfile();

  console.log(
    `Pruned security overrides: ${redundantOverrides.join(", ")}.`,
  );
}

async function main() {
  const packageJson = await loadPackageJson();
  const overrideCount = Object.keys(packageJson.overrides ?? {}).length;
  const redundantOverrides = await findRedundantOverrides(packageJson);
  const shouldWrite = process.argv.includes("--write");

  if (shouldWrite && redundantOverrides.length > 0) {
    await pruneOverrides(packageJson, redundantOverrides);
    return;
  }

  reportResults(overrideCount, redundantOverrides);
}

await main();
