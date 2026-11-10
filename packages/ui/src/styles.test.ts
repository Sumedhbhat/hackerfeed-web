import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
	join(import.meta.dirname, "styles.css"),
	"utf8",
);
const names = (prefix: string) =>
	[...stylesheet.matchAll(new RegExp(`--${prefix}-([a-z-]+):`, "g"))].map(
		(match) => match[1],
	);

describe("theme tokens", () => {
	// `text-page` would set both a size and a colour if each had a `page` token.
	it("never gives a colour the name of a text size", () => {
		const sizes = new Set(names("text"));
		expect(names("color").filter((color) => sizes.has(color))).toEqual([]);
	});
});
