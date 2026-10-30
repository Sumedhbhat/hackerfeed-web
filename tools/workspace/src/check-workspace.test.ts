import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	checkWorkspace,
	findImports,
	loadWorkspace,
	type Project,
	type Workspace,
} from "./check-workspace";
import { libraryFiles } from "./new-library";

const owner = "@Sumedhbhat";

function project(
	name: string,
	root: string,
	type: string,
	platform: string,
	packageJson?: Project["packageJson"],
	implicitDependencies: string[] = [],
): Project {
	return {
		name,
		root,
		tags: [`type:${type}`, `platform:${platform}`, "scope:hackerfeed"],
		owner,
		implicitDependencies,
		packageJson,
	};
}

const workspaceDeps = {
	"@hackerfeed/api-client": "workspace:*",
	"@hackerfeed/backend": "workspace:*",
	"@hackerfeed/contracts": "workspace:*",
	"@hackerfeed/ui": "workspace:*",
};

function fixture(
	sources: Record<string, string>,
	overrides: Partial<Record<string, Partial<Project>>> = {},
	extra: Project[] = [],
): Workspace {
	const projects = [
		{
			...project("web", "apps/web", "app", "browser", {
				name: "@hackerfeed/web",
				dependencies: { ...workspaceDeps, react: "19" },
			}),
			tags: [
				"type:app",
				"platform:browser",
				"platform:server",
				"scope:hackerfeed",
			],
		},
		project("ui", "packages/ui", "ui", "browser", {
			name: "@hackerfeed/ui",
			exports: { "./atoms/Button": "./src/atoms/Button.tsx" },
			dependencies: { react: "19", "@hackerfeed/backend": "workspace:*" },
		}),
		project("contracts", "packages/contracts", "contracts", "shared", {
			name: "@hackerfeed/contracts",
			exports: { "./ai": "./src/ai.ts" },
			dependencies: { zod: "4", "drizzle-orm": "0", react: "19" },
		}),
		project("backend", "packages/backend", "backend", "server", {
			name: "@hackerfeed/backend",
			exports: {
				".": "./src/index.ts",
				"./api-types": "./src/api-types.ts",
			},
			dependencies: { "@hackerfeed/contracts": "workspace:*", react: "19" },
		}),
		project("api-client", "packages/api-client", "api-client", "browser", {
			name: "@hackerfeed/api-client",
			exports: { "./trpc": "./src/trpc.ts" },
			dependencies: { "@trpc/client": "11" },
			devDependencies: { "@hackerfeed/backend": "workspace:*" },
		}),
		project("tf-module", "infra/modules/token", "infra", "ci"),
		project("infra-prod", "infra/prod", "infra", "ci", undefined, [
			"tf-module",
		]),
		...extra,
	].map((p) => ({ ...p, ...overrides[p.name] }));
	const files: Record<string, string> = {
		"package.json": "{}",
		"packages/ui/src/atoms/Button.tsx": `import { useState } from "react";`,
		"packages/contracts/src/ai.ts": `import { z } from "zod";`,
		"packages/backend/src/index.ts": `import { z } from "@hackerfeed/contracts/ai";`,
		"packages/backend/src/api-types.ts": `export type { AppRouter } from "./trpc/router";`,
		"packages/api-client/src/trpc.ts": `import type { AppRouter } from "@hackerfeed/backend/api-types";\nimport { createTRPCClient } from "@trpc/client";`,
		"apps/web/src/main.tsx": `import { Button } from "@hackerfeed/ui/atoms/Button";\nimport { createBackend } from "@hackerfeed/backend";`,
		"infra/modules/token/main.tf": "",
		"infra/prod/main.tf": `module "token" {\n  source = "../modules/token"\n}`,
		...sources,
	};
	return {
		projects,
		rootPackageJson: { devDependencies: { vitest: "5" } },
		files: Object.keys(files),
		read: (path) => files[path],
	};
}

const check = (...args: Parameters<typeof fixture>) =>
	checkWorkspace(fixture(...args));

describe("findImports", () => {
	it("finds static, re-export, side-effect, dynamic and mocked imports", () => {
		const source = `import a, { b } from "a";
import type { C } from "c";
import { type D, type E } from "d";
export { f } from "f";
export type { G } from "g";
import "h";
const i = await import("i");
vi.mock("j", () => ({}));
// import { k } from "k";
/* import { l } from "l"; */
const m = \`import { m } from "m"\`;`;
		expect(
			findImports(source).map(({ specifier, typeOnly }) => [
				specifier,
				typeOnly,
			]),
		).toEqual([
			["a", false],
			["c", true],
			["d", true],
			["f", false],
			["g", true],
			["h", false],
			["i", false],
			["j", false],
		]);
	});
});

describe("checkWorkspace", () => {
	it("passes the fixture workspace", () => {
		expect(check({})).toEqual([]);
	});

	it("rejects UI importing backend runtime code", () => {
		expect(
			check({
				"packages/ui/src/atoms/Button.tsx": `import { createBackend } from "@hackerfeed/backend";`,
			}),
		).toEqual([
			expect.stringContaining(
				"ui project ui may not import backend project backend",
			),
			expect.stringContaining(
				"browser code in ui may not import server project backend",
			),
		]);
	});

	it.each(["drizzle-orm", "react"])(
		"rejects contracts importing %s",
		(name) => {
			expect(
				check({ "packages/contracts/src/ai.ts": `import x from "${name}";` }),
			).toEqual([
				expect.stringContaining(`contracts projects may not import ${name}`),
			]);
		},
	);

	it("rejects backend importing React", () => {
		expect(
			check({
				"packages/backend/src/index.ts": `import { useState } from "react";`,
			}),
		).toEqual([
			expect.stringContaining("backend projects may not import react"),
		]);
	});

	it("allows npm packages in tests and config files", () => {
		expect(
			check({
				"packages/contracts/src/ai.test.ts": `import { it } from "vitest";`,
				"packages/contracts/vitest.config.ts": `import { defineConfig } from "vitest/config";`,
			}),
		).toEqual([
			expect.stringContaining(
				"imports vitest, which packages/contracts/package.json does not declare",
			),
			expect.stringContaining(
				"imports vitest, which packages/contracts/package.json does not declare",
			),
		]);
	});

	it("rejects relative imports into another project", () => {
		expect(
			check({
				"apps/web/src/main.tsx": `import { Button } from "../../../packages/ui/src/atoms/Button";`,
			}),
		).toEqual([
			expect.stringContaining(
				`relative import "../../../packages/ui/src/atoms/Button" leaves web`,
			),
		]);
	});

	it("rejects imports of paths a package does not export", () => {
		expect(
			check({
				"apps/web/src/main.tsx": `import { db } from "@hackerfeed/backend/database/client";`,
			}),
		).toEqual([
			expect.stringContaining(
				`"@hackerfeed/backend/database/client" is not a public export`,
			),
		]);
	});

	it("rejects undeclared dependencies", () => {
		expect(
			check({
				"packages/contracts/src/ai.ts": `import { z } from "zod";\nimport ky from "ky";`,
			}),
		).toEqual([
			expect.stringContaining(
				"imports ky, which packages/contracts/package.json does not declare",
			),
			expect.stringContaining("contracts projects may not import ky"),
		]);
	});

	it("allows the router type edge only as a type import of api-types", () => {
		expect(
			check({
				"packages/api-client/src/trpc.ts": `import { AppRouter } from "@hackerfeed/backend/api-types";`,
			}),
		).toEqual([expect.stringContaining(`only with "import type"`)]);
		expect(
			check({
				"packages/api-client/src/trpc.ts": `import { createBackend } from "@hackerfeed/backend";`,
			}),
		).toEqual([
			expect.stringContaining("only through @hackerfeed/backend/api-types"),
		]);
	});

	it("requires an owner and one tag per dimension", () => {
		expect(
			check({}, { ui: { owner: undefined, tags: ["type:ui", "type:app"] } }),
		).toEqual([
			expect.stringContaining("needs exactly one type:* tag"),
			expect.stringContaining("needs platform:* tags"),
			expect.stringContaining("needs exactly one scope:* tag"),
			expect.stringContaining("needs metadata.owner"),
		]);
	});

	it("rejects files outside every project and nested projects", () => {
		expect(
			check({ "packages/orphan/src/index.ts": "" }, {}, [
				project("nested", "apps/web/src/nested", "app", "browser"),
			]),
		).toEqual([
			expect.stringContaining(
				"web (apps/web): contains another project, nested",
			),
			expect.stringContaining(
				"packages/orphan/src/index.ts: belongs to no project",
			),
		]);
	});

	it("rejects Terraform modules used without a declared edge", () => {
		expect(check({}, { "infra-prod": { implicitDependencies: [] } })).toEqual([
			expect.stringContaining(
				"uses module tf-module; add it to infra-prod's implicitDependencies",
			),
		]);
	});

	it("rejects implicit dependencies on projects that do not exist", () => {
		expect(
			check(
				{},
				{ "infra-prod": { implicitDependencies: ["tf-module", "infra-ci"] } },
			),
		).toEqual([
			expect.stringContaining("implicit dependency infra-ci is not a project"),
		]);
	});

	it("rejects exports that point at missing files", () => {
		expect(
			check(
				{},
				{
					contracts: {
						packageJson: {
							name: "@hackerfeed/contracts",
							exports: { "./ai": "./src/ai.ts", "./gone": "./src/gone.ts" },
							dependencies: { zod: "4" },
						},
					},
				},
			),
		).toEqual([
			expect.stringContaining(
				`export "./gone" points at missing packages/contracts/src/gone.ts`,
			),
		]);
	});

	it("reports dependency cycles", () => {
		const errors = check(
			{},
			{ "tf-module": { implicitDependencies: ["infra-prod"] } },
		);
		expect(errors).toEqual([
			"dependency cycle: tf-module -> infra-prod -> tf-module",
		]);
	});

	it("accepts a library made by the generator", () => {
		const files = libraryFiles("search", {
			type: "domain",
			platform: "shared",
			owner,
			vitest: "^5.0.4",
		});
		const projectJson = JSON.parse(files["project.json"]);
		const generated: Project = {
			name: projectJson.name,
			root: "packages/search",
			tags: projectJson.tags,
			owner: projectJson.metadata.owner,
			implicitDependencies: [],
			packageJson: JSON.parse(files["package.json"]),
		};
		const sources = Object.fromEntries(
			Object.entries(files).map(([path, text]) => [
				`packages/search/${path}`,
				text,
			]),
		);
		expect(check(sources, {}, [generated])).toEqual([]);
	});
});

describe("this repository", () => {
	it("passes the workspace check", () => {
		const root = join(import.meta.dirname, "../../..");
		expect(checkWorkspace(loadWorkspace(root))).toEqual([]);
	});
});
