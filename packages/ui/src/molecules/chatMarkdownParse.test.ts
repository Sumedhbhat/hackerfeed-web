import { describe, expect, it } from "vitest";
import { parseInline, toBlocks } from "./chatMarkdownParse";

describe("toBlocks", () => {
	it("splits paragraphs, headings and fenced code", () => {
		expect(toBlocks("## Title\n\nOne\ntwo\n\n```\na\n\nb\n```")).toEqual([
			{ kind: "h", level: 3, text: "Title" },
			{ kind: "p", lines: ["One", "two"] },
			{ kind: "pre", lines: ["a", "", "b"] },
		]);
	});

	it("nests list items by the indents used and keeps ordered starts", () => {
		expect(toBlocks("3. Parent\n    - Child\n4. Next")).toEqual([
			{
				kind: "ol",
				start: 3,
				items: [
					{
						text: "Parent",
						children: [{ kind: "ul", start: 1, items: [{ text: "Child" }] }],
					},
					{ text: "Next" },
				],
			},
		]);
	});
});

describe("parseInline", () => {
	it("finds bold, code and safe links", () => {
		expect(
			parseInline("A **b** `c` [d](https://e.example/f_(g)) [x](javascript:y)"),
		).toEqual([
			{ kind: "text", text: "A " },
			{ kind: "strong", text: "b" },
			{ kind: "text", text: " " },
			{ kind: "code", text: "c" },
			{ kind: "text", text: " " },
			{ kind: "link", text: "d", href: "https://e.example/f_(g)" },
			{ kind: "text", text: " " },
			{ kind: "text", text: "[x](javascript:y)" },
		]);
	});
});
