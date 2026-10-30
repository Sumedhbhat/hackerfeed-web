import { describe, expect, it } from "vitest";
import { libraryFiles } from "./new-library";

const options = {
	type: "domain",
	platform: "shared",
	owner: "@Sumedhbhat",
	vitest: "^5.0.4",
	happyDom: "^21.0.4",
};

describe("libraryFiles", () => {
	it("creates a package with public exports, targets, tags and an owner", () => {
		const files = libraryFiles("search", options);
		expect(JSON.parse(files["package.json"])).toMatchObject({
			name: "@hackerfeed/search",
			private: true,
			exports: { ".": "./src/index.ts" },
			devDependencies: { vitest: "^5.0.4" },
		});
		expect(JSON.parse(files["project.json"])).toMatchObject({
			name: "search",
			tags: ["type:domain", "platform:shared", "scope:shared"],
			metadata: { owner: "@Sumedhbhat" },
			targets: { lint: {}, typecheck: {}, test: {} },
		});
	});

	it("declares happy-dom for browser libraries", () => {
		const files = libraryFiles("widgets", { ...options, platform: "browser" });
		expect(JSON.parse(files["package.json"]).devDependencies).toEqual({
			"happy-dom": "^21.0.4",
			vitest: "^5.0.4",
		});
		expect(files["vitest.config.ts"]).toContain(`environment: "happy-dom"`);
	});

	it.each([
		["Bad Name", options],
		["search", { ...options, type: "feature" }],
		["search", { ...options, platform: "edge" }],
		["search", { ...options, owner: "nobody" }],
	])("rejects %s with %o", (name, invalid) => {
		expect(() => libraryFiles(name, invalid)).toThrow();
	});
});
