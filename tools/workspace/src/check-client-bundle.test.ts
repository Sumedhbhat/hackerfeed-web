import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { backendMarkers, findBackendCode } from "./check-client-bundle";

let directory = "";

afterEach(() => {
	if (directory) rmSync(directory, { recursive: true, force: true });
});

function bundle(files: Record<string, string>) {
	directory = mkdtempSync(join(tmpdir(), "hf-bundle-"));
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(join(directory, path, ".."), { recursive: true });
		writeFileSync(join(directory, path), text);
	}
	return directory;
}

describe("client bundle check", () => {
	it("takes every table name from the schema", () => {
		const schema = `export const a = sqliteTable("app_users", {});
export const b = sqliteTable(
	"stories", {});
export const c = sqliteTable("hf_papers", {});`;
		expect(backendMarkers(schema)).toEqual([
			"app_users",
			"stories",
			"hf_papers",
		]);
	});

	it("reports a chunk that declares a table, even without an underscore", () => {
		const found = findBackendCode(
			bundle({
				"assets/ok.js": `const tab = { id: "stories", label: "favorites" };`,
				"assets/leak.js": `const t=q("stories",{id:i("id")});`,
			}),
			["stories", "favorites"],
		);
		expect(found).toEqual([
			`${join(directory, "assets/leak.js")}: table stories`,
		]);
	});

	it("passes a bundle without backend code", () => {
		expect(
			findBackendCode(bundle({ "index.html": "<html></html>" }), ["hf_papers"]),
		).toEqual([]);
	});
});
