import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const overrides = Object.keys(packageJson.overrides ?? {});
const redundant = [];

for (const dependency of overrides) {
  const directory = await mkdtemp(join(tmpdir(), "hackerfeed-override-"));

  try {
    const candidate = structuredClone(packageJson);
    delete candidate.overrides[dependency];

    if (Object.keys(candidate.overrides).length === 0) {
      delete candidate.overrides;
    }

    await writeFile(
      join(directory, "package.json"),
      `${JSON.stringify(candidate, null, 2)}\n`,
    );
    await cp("bun.lock", join(directory, "bun.lock"));

    const install = Bun.spawnSync(
      ["bun", "install", "--lockfile-only", "--ignore-scripts"],
      { cwd: directory, stdout: "ignore", stderr: "ignore" },
    );
    const audit = Bun.spawnSync(["bun", "audit", "--audit-level=high"], {
      cwd: directory,
      stdout: "ignore",
      stderr: "ignore",
    });

    if (install.success && audit.success) {
      redundant.push(dependency);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (redundant.length > 0) {
  console.error(
    `Redundant security overrides: ${redundant.join(", ")}. Remove them and regenerate bun.lock.`,
  );
  process.exit(1);
}

console.log(`Checked ${overrides.length} security override(s); all are required.`);
