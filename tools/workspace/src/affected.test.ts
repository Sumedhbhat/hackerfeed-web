import { describe, expect, it } from "vitest";
import { selectProjects } from "./affected";

const ALL = [
	"api-client",
	"backend",
	"contracts",
	"hacker-news",
	"infra-ci",
	"infra-deploy",
	"infra-prod",
	"runtime",
	"state-backend",
	"tf-ci-token",
	"ui",
	"web",
	"workspace",
];

const INFRA_ROOTS = ["infra-deploy", "infra-prod"];

// Each row is a change and the projects Nx must select for it.
const matrix: [string, string, string[]][] = [
	[
		"a shared schema",
		"packages/contracts/src/ai.ts",
		["api-client", "backend", "contracts", "web"],
	],
	["a UI component", "packages/ui/src/atoms/Button.tsx", ["ui", "web"]],
	[
		"the backend router",
		"packages/backend/src/trpc/router.ts",
		["api-client", "backend", "web"],
	],
	[
		"the production Terraform root",
		"infra/cloudflare-prod/main.tf",
		["infra-prod"],
	],
	[
		"the shared Terraform token module",
		"infra/modules/ci-token/main.tf",
		[...INFRA_ROOTS, "tf-ci-token"],
	],
	[
		"the OIDC and recovery wrapper",
		"tools/infra-ci/state_proxy.py",
		["infra-ci", ...INFRA_ROOTS, "state-backend"],
	],
	[
		"the Terraform state Worker",
		"apps/state-backend/src/index.ts",
		["state-backend"],
	],
	["the root lockfile", "bun.lock", ALL],
	["a workflow", ".github/workflows/build.yaml", ALL],
	["the boundary policy", "tools/workspace/src/policy.ts", ALL],
	["the Biome rules", "biome.json", ALL],
	["documentation only", "README.md", []],
];

describe("affected selection", () => {
	it.each(matrix)("%s selects the right projects", (_name, file, expected) => {
		expect(selectProjects({ files: [file] }).projects).toEqual(
			[...expected].sort(),
		);
	});

	it("falls back to every project when the base is unknown", () => {
		const selection = selectProjects({ base: "0".repeat(40) });
		expect(selection.mode).toBe("full");
		expect(selection.projects).toEqual(ALL);
	});

	it("falls back to every project without a base", () => {
		expect(selectProjects({}, () => ALL)).toMatchObject({
			mode: "full",
			projects: ALL,
		});
	});
});
