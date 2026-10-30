// Creates packages/<name>: a private workspace package with public exports,
// Nx targets, tags and an owner. CI picks it up through the project graph.
//
//   bun run new:library <name> --type <type> --platform <platform> [--owner @login]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PLATFORMS, TYPES } from "./policy";

const root = join(import.meta.dirname, "../../..");

export function libraryFiles(
	name: string,
	{
		type,
		platform,
		owner,
		vitest,
	}: { type: string; platform: string; owner: string; vitest: string },
): Record<string, string> {
	if (!/^[a-z][a-z0-9-]*$/.test(name)) {
		throw new Error(`Library name must be kebab-case, got "${name}"`);
	}
	if (!TYPES.includes(type)) {
		throw new Error(`--type must be one of ${TYPES.join(", ")}`);
	}
	if (!PLATFORMS.includes(platform)) {
		throw new Error(`--platform must be one of ${PLATFORMS.join(", ")}`);
	}
	if (!/^@[\w-]+(\/[\w-]+)?$/.test(owner)) {
		throw new Error(`--owner must be a GitHub login or team, got "${owner}"`);
	}
	const json = (value: unknown) => `${JSON.stringify(value, null, "\t")}\n`;
	return {
		"package.json": json({
			name: `@hackerfeed/${name}`,
			private: true,
			type: "module",
			exports: { ".": "./src/index.ts" },
			devDependencies: { vitest },
		}),
		"project.json": json({
			$schema: "../../node_modules/nx/schemas/project-schema.json",
			name,
			projectType: "library",
			sourceRoot: `packages/${name}/src`,
			tags: [`type:${type}`, `platform:${platform}`, "scope:shared"],
			metadata: { owner },
			targets: { lint: {}, typecheck: {}, test: {} },
		}),
		"tsconfig.json": json({
			extends: "../../tsconfig.base.json",
			include: ["src/**/*.ts", "src/**/*.tsx", "*.ts"],
		}),
		"vitest.config.ts": `import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "${platform === "browser" ? "happy-dom" : "node"}",
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
`,
		"src/index.ts": `export const name = "${name}";\n`,
		"src/index.test.ts": `import { expect, it } from "vitest";
import { name } from "./index";

it("exports its public entry point", () => {
	expect(name).toBe("${name}");
});
`,
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		allowPositionals: true,
		options: {
			type: { type: "string" },
			platform: { type: "string" },
			owner: { type: "string", default: "@Sumedhbhat" },
		},
	});
	const [name] = positionals;
	if (!name || !values.type || !values.platform) {
		console.error(
			"usage: bun run new:library <name> --type <type> --platform <platform> [--owner @login]",
		);
		process.exit(2);
	}
	const directory = join(root, "packages", name);
	if (existsSync(directory)) {
		console.error(`packages/${name} already exists`);
		process.exit(1);
	}
	const rootPackage = JSON.parse(
		readFileSync(join(root, "package.json"), "utf8"),
	);
	const files = libraryFiles(name, {
		type: values.type,
		platform: values.platform,
		owner: values.owner,
		vitest: rootPackage.devDependencies.vitest,
	});
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(join(directory, path, ".."), { recursive: true });
		writeFileSync(join(directory, path), content);
	}
	console.log(`Created packages/${name}. Run \`bun install\` to link it.`);
}
