import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = join(dirname(new URL(import.meta.url).pathname), "../..");
const app = root;
const biome = join(root, "node_modules/.bin/biome");

const STYLING = "plugin";
const RAW_ELEMENT = "lint/correctness/noRestrictedElements";
const LAYER_IMPORT = "lint/style/noRestrictedImports";

const fixtures: Record<string, string> = {
	"src/components/organisms/x/ClassName.tsx": `export const A = () => <div className="p-4" />;`,
	"src/components/organisms/x/Style.tsx": `export const A = () => <div style={{ color: "red" }} />;`,
	"src/components/organisms/x/ClassAttr.tsx": `export const A = () => <div class="p-4" />;`,
	"src/components/organisms/x/Spread.tsx": `export const A = () => <div {...{ className: "p-4" }} />;`,
	"src/components/organisms/x/SpreadOk.tsx": `export const A = () => <div {...{ id: "a" }} />;`,
	"src/components/pages/RawLink.tsx": `export const A = () => <a href="/x">x</a>;`,
	"src/components/pages/RawHeading.tsx": `export const A = () => <h2>x</h2>;`,
	"src/routes/RawStyleTag.tsx": `export const A = () => <style>{".a{}"}</style>;`,
	"src/features/NewFolder.tsx": `export const A = () => <div className="p-4" />;`,
	"src/components/atoms/AtomOk.tsx": `export const A = () => <a className="p-4" href="/x">x</a>;`,
	"src/features/RawButton.tsx": `export const A = () => <button type="button">x</button>;`,
	"src/components/molecules/ImportsHook.tsx": `import { useFeed } from "#/hooks/useFeed";\nexport const A = () => <span>{String(useFeed)}</span>;`,
	"src/components/atoms/ImportsHook.tsx": `import { useFeed } from "#/hooks/useFeed";\nexport const A = () => <span>{String(useFeed)}</span>;`,
	"src/components/atoms/BaseUiOk.tsx": `import { Toggle } from "@base-ui/react/toggle";\nexport const A = () => <Toggle />;`,
	"src/components/molecules/BaseUi.tsx": `import { Toggle } from "@base-ui/react/toggle";\nexport const A = () => <Toggle />;`,
	"src/components/organisms/x/BaseUi.tsx": `import { Toggle } from "@base-ui/react/toggle";\nexport const A = () => <Toggle />;`,
};

const expected: Record<string, string[]> = {
	"src/components/organisms/x/ClassName.tsx": [STYLING],
	"src/components/organisms/x/Style.tsx": [STYLING],
	"src/components/organisms/x/ClassAttr.tsx": [STYLING],
	"src/components/organisms/x/Spread.tsx": [STYLING],
	"src/components/organisms/x/SpreadOk.tsx": [],
	"src/components/pages/RawLink.tsx": [RAW_ELEMENT],
	"src/components/pages/RawHeading.tsx": [RAW_ELEMENT],
	"src/routes/RawStyleTag.tsx": [RAW_ELEMENT],
	"src/features/NewFolder.tsx": [STYLING],
	"src/components/atoms/AtomOk.tsx": [],
	"src/features/RawButton.tsx": [RAW_ELEMENT],
	"src/components/molecules/ImportsHook.tsx": [LAYER_IMPORT],
	"src/components/atoms/ImportsHook.tsx": [LAYER_IMPORT],
	"src/components/atoms/BaseUiOk.tsx": [],
	"src/components/molecules/BaseUi.tsx": [LAYER_IMPORT],
	"src/components/organisms/x/BaseUi.tsx": [LAYER_IMPORT],
};

type Diagnostic = {
	category: string;
	severity: string;
	message: string;
	location: { path: string };
};

let workdir: string;
let diagnostics: Diagnostic[];

beforeAll(() => {
	workdir = mkdtempSync(join(tmpdir(), "hf-lint-"));
	cpSync(join(root, "biome.json"), join(workdir, "biome.json"));
	cpSync(join(root, "lint"), join(workdir, "lint"), { recursive: true });
	for (const [path, code] of Object.entries(fixtures)) {
		mkdirSync(dirname(join(workdir, path)), { recursive: true });
		writeFileSync(join(workdir, path), `${code}\n`);
	}
	const result = spawnSync(biome, ["lint", "--reporter=json", "src"], {
		cwd: workdir,
		encoding: "utf8",
	});
	diagnostics = JSON.parse(result.stdout).diagnostics;
}, 30_000);

afterAll(() => {
	rmSync(workdir, { recursive: true, force: true });
});

describe("component layer lint rules", () => {
	it("loads every Grit plugin without errors", () => {
		const broken = diagnostics.filter((d) => d.message.includes("errored"));
		expect(broken).toEqual([]);
	});

	it.each(Object.entries(expected))("%s", (path, categories) => {
		const found = diagnostics
			.filter((d) => d.location.path === path && d.severity === "error")
			.map((d) => d.category);
		expect([...new Set(found)].sort()).toEqual(categories);
	});
});

describe("suppressions", () => {
	const layerRules =
		/biome-ignore[^\n]*(lint\/plugin|noRestrictedElements|noRestrictedImports)/;

	function* sourceFiles(dir: string): Generator<string> {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) yield* sourceFiles(path);
			else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test."))
				yield path;
		}
	}

	it("never silences the component layer rules", () => {
		const offenders = [...sourceFiles(join(app, "src"))]
			.map((path) => relative(root, path))
			.filter((path) =>
				layerRules.test(readFileSync(join(root, path), "utf8")),
			);
		expect(offenders).toEqual([]);
	});
});
