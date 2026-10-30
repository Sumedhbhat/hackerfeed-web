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

const root = join(import.meta.dirname, "../../..");
const biome = join(root, "node_modules/.bin/biome");

const STYLING = "plugin";
const RAW_ELEMENT = "lint/correctness/noRestrictedElements";
const LAYER_IMPORT = "lint/style/noRestrictedImports";

const WEB = "apps/web/src";
const UI = "packages/ui/src";

const fixtures: Record<string, string> = {
	[`${WEB}/components/organisms/x/ClassName.tsx`]: `export const A = () => <div className="p-4" />;`,
	[`${WEB}/components/organisms/x/Style.tsx`]: `export const A = () => <div style={{ color: "red" }} />;`,
	[`${WEB}/components/organisms/x/ClassAttr.tsx`]: `export const A = () => <div class="p-4" />;`,
	[`${WEB}/components/organisms/x/Spread.tsx`]: `export const A = () => <div {...{ className: "p-4" }} />;`,
	[`${WEB}/components/organisms/x/SpreadOk.tsx`]: `export const A = () => <div {...{ id: "a" }} />;`,
	[`${WEB}/components/pages/RawLink.tsx`]: `export const A = () => <a href="/x">x</a>;`,
	[`${WEB}/components/pages/RawHeading.tsx`]: `export const A = () => <h2>x</h2>;`,
	[`${WEB}/routes/RawStyleTag.tsx`]: `export const A = () => <style>{".a{}"}</style>;`,
	[`${WEB}/features/NewFolder.tsx`]: `export const A = () => <div className="p-4" />;`,
	[`${WEB}/features/RawButton.tsx`]: `export const A = () => <button type="button">x</button>;`,
	"packages/new-lib/src/Styled.tsx": `export const A = () => <div className="p-4" />;`,
	[`${UI}/features/Styled.tsx`]: `export const A = () => <div className="p-4" />;`,
	[`${UI}/features/RawButton.tsx`]: `export const A = () => <button type="button">x</button>;`,
	[`${UI}/atoms/AtomOk.tsx`]: `export const A = () => <a className="p-4" href="/x">x</a>;`,
	[`${UI}/molecules/ImportsHook.tsx`]: `import { useFeed } from "#/hooks/useFeed";\nexport const A = () => <span>{String(useFeed)}</span>;`,
	[`${UI}/atoms/ImportsHook.tsx`]: `import { useFeed } from "#/hooks/useFeed";\nexport const A = () => <span>{String(useFeed)}</span>;`,
	[`${UI}/atoms/ImportsPackage.tsx`]: `import { logger } from "@hackerfeed/runtime/logger";\nexport const A = () => <span>{String(logger)}</span>;`,
	[`${UI}/molecules/ImportsAtomOk.tsx`]: `import { Text } from "@hackerfeed/ui/atoms/Text";\nexport const A = () => <Text>x</Text>;`,
	[`${UI}/atoms/ImportsMolecule.tsx`]: `import { EmptyState } from "@hackerfeed/ui/molecules/EmptyState";\nexport const A = () => <EmptyState title="x" />;`,
	[`${UI}/atoms/BaseUiOk.tsx`]: `import { Toggle } from "@base-ui/react/toggle";\nexport const A = () => <Toggle />;`,
	[`${UI}/molecules/BaseUi.tsx`]: `import { Toggle } from "@base-ui/react/toggle";\nexport const A = () => <Toggle />;`,
	[`${WEB}/components/organisms/x/BaseUi.tsx`]: `import { Toggle } from "@base-ui/react/toggle";\nexport const A = () => <Toggle />;`,
};

const expected: Record<string, string[]> = {
	[`${WEB}/components/organisms/x/ClassName.tsx`]: [STYLING],
	[`${WEB}/components/organisms/x/Style.tsx`]: [STYLING],
	[`${WEB}/components/organisms/x/ClassAttr.tsx`]: [STYLING],
	[`${WEB}/components/organisms/x/Spread.tsx`]: [STYLING],
	[`${WEB}/components/organisms/x/SpreadOk.tsx`]: [],
	[`${WEB}/components/pages/RawLink.tsx`]: [RAW_ELEMENT],
	[`${WEB}/components/pages/RawHeading.tsx`]: [RAW_ELEMENT],
	[`${WEB}/routes/RawStyleTag.tsx`]: [RAW_ELEMENT],
	[`${WEB}/features/NewFolder.tsx`]: [STYLING],
	[`${WEB}/features/RawButton.tsx`]: [RAW_ELEMENT],
	"packages/new-lib/src/Styled.tsx": [STYLING],
	[`${UI}/features/Styled.tsx`]: [STYLING],
	[`${UI}/features/RawButton.tsx`]: [RAW_ELEMENT],
	[`${UI}/atoms/AtomOk.tsx`]: [],
	[`${UI}/molecules/ImportsHook.tsx`]: [LAYER_IMPORT],
	[`${UI}/atoms/ImportsHook.tsx`]: [LAYER_IMPORT],
	[`${UI}/atoms/ImportsPackage.tsx`]: [LAYER_IMPORT],
	[`${UI}/molecules/ImportsAtomOk.tsx`]: [],
	[`${UI}/atoms/ImportsMolecule.tsx`]: [LAYER_IMPORT],
	[`${UI}/atoms/BaseUiOk.tsx`]: [],
	[`${UI}/molecules/BaseUi.tsx`]: [LAYER_IMPORT],
	[`${WEB}/components/organisms/x/BaseUi.tsx`]: [LAYER_IMPORT],
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
	const result = spawnSync(
		biome,
		["lint", "--reporter=json", "apps", "packages"],
		{
			cwd: workdir,
			encoding: "utf8",
		},
	);
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
			if (entry.isDirectory()) {
				if (!["node_modules", "dist", ".wrangler"].includes(entry.name))
					yield* sourceFiles(path);
			} else if (
				/\.(ts|tsx)$/.test(entry.name) &&
				!entry.name.includes(".test.")
			)
				yield path;
		}
	}

	it("never silences the component layer rules", () => {
		const offenders = ["apps", "packages", "tools"]
			.flatMap((dir) => [...sourceFiles(join(root, dir))])
			.map((path) => relative(root, path))
			.filter((path) =>
				layerRules.test(readFileSync(join(root, path), "utf8")),
			);
		expect(offenders).toEqual([]);
	});
});
