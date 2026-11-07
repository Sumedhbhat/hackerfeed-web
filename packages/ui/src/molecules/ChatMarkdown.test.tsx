import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatMarkdown } from "./ChatMarkdown";

afterEach(cleanup);

describe("ChatMarkdown", () => {
	it("renders paragraphs, numbered lists, bold and code", () => {
		const { container } = render(
			<ChatMarkdown
				text={
					"Three choices.\n\n1. **One map.** Keyed by `A1`.\n2. Lazy formulas.\n\nThat is all."
				}
			/>,
		);

		expect(container.querySelectorAll("p")).toHaveLength(2);
		const items = screen.getAllByRole("listitem");
		expect(items.map((item) => item.textContent)).toEqual([
			"One map. Keyed by A1.",
			"Lazy formulas.",
		]);
		expect(container.querySelector("ol")).not.toBeNull();
		expect(screen.getByText("One map.").tagName).toBe("STRONG");
		expect(screen.getByText("A1").tagName).toBe("CODE");
	});

	it("groups bullet lines into one unordered list", () => {
		const { container } = render(<ChatMarkdown text={"- a\n- b\n* c"} />);

		expect(container.querySelectorAll("ul")).toHaveLength(1);
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
	});

	it("keeps a numbered list together across blank lines and keeps its start", () => {
		const { container } = render(
			<ChatMarkdown
				text={"1. First\n\n2. Second\n\nThen prose.\n\n4. Fourth"}
			/>,
		);

		const lists = container.querySelectorAll("ol");
		expect(lists).toHaveLength(2);
		expect(lists[0]?.querySelectorAll("li")).toHaveLength(2);
		expect(lists[0]?.getAttribute("start")).toBeNull();
		expect(lists[1]?.getAttribute("start")).toBe("4");
	});

	it("renders fenced code verbatim, keeping indentation and blank lines", () => {
		const code = "function add(a, b) {\n\n  return a + b; // **not bold**\n}";
		const { container } = render(
			<ChatMarkdown text={`Here:\n\n\`\`\`js\n${code}\n\`\`\`\n\nDone.`} />,
		);

		const pre = container.querySelector("pre code");
		expect(pre?.textContent).toBe(code);
		expect(container.querySelector("pre strong")).toBeNull();
		expect(container.textContent).not.toContain("```");
		expect(container.querySelectorAll("p")).toHaveLength(2);
	});

	it("makes code blocks a named, focusable region so the keyboard can scroll them", () => {
		const { container } = render(
			<ChatMarkdown text={`\`\`\`\n${"x".repeat(200)}\n\`\`\``} />,
		);
		const region = container.querySelector("pre")?.closest("section");
		expect(region?.getAttribute("tabindex")).toBe("0");
		expect(region?.getAttribute("aria-label")).toBe("Code");
	});

	it("closes a longer fence only with a fence at least as long", () => {
		const { container } = render(
			<ChatMarkdown text={"````md\n```js\nx\n```\n````\n\nDone."} />,
		);

		expect(container.querySelector("pre code")?.textContent).toBe(
			"```js\nx\n```",
		);
		expect(container.querySelector("pre")?.textContent).not.toContain("Done.");
		expect(screen.getByText("Done.").tagName).toBe("P");
	});

	it("shows an unclosed fence (a reply still streaming) as code so far", () => {
		const { container } = render(<ChatMarkdown text={"```\nconst x = 1;"} />);

		expect(container.querySelector("pre code")?.textContent).toBe(
			"const x = 1;",
		);
	});

	it("renders headings as bold lines and web links as new-tab anchors", () => {
		const { container } = render(
			<ChatMarkdown
				text={
					"## Sources\n\nSee [the paper](https://arxiv.org/abs/1) and [this](javascript:alert(1))."
				}
			/>,
		);

		expect(container.textContent).not.toContain("##");
		expect(
			screen.getByRole("heading", { name: "Sources", level: 3 }),
		).toBeTruthy();
		const link = screen.getByRole("link", { name: "the paper" });
		expect(link.getAttribute("href")).toBe("https://arxiv.org/abs/1");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toContain("noopener");
		expect(screen.queryByRole("link", { name: "this" })).toBeNull();
		expect(container.textContent).toContain("[this](javascript:alert(1))");
	});

	it("nests indented items and joins continuation lines into their item", () => {
		const { container } = render(
			<ChatMarkdown
				text={
					"- Parent\n  - Child one\n  - Child two\n    continues here\n- Sibling"
				}
			/>,
		);

		const top = container.querySelector("ul");
		expect(top?.querySelectorAll(":scope > li")).toHaveLength(2);
		const nested = top?.querySelector("li ul");
		expect(nested?.querySelectorAll("li")).toHaveLength(2);
		expect(nested?.querySelectorAll("li")[1]?.textContent).toBe(
			"Child two continues here",
		);
		expect(container.querySelectorAll("p")).toHaveLength(0);
	});

	it("treats items at the same indent as siblings, whatever the indent width", () => {
		const { container } = render(
			<ChatMarkdown
				text={"1. Parent\n    - Child one\n    - Child two\n2. Next"}
			/>,
		);

		const top = container.querySelector("ol");
		expect(top?.querySelectorAll(":scope > li")).toHaveLength(2);
		const nested = top?.querySelector(":scope > li > ul");
		expect(nested?.querySelectorAll(":scope > li")).toHaveLength(2);
		expect(nested?.querySelector("ul")).toBeNull();
	});

	it("starts a new nested list when the marker kind changes", () => {
		const { container } = render(
			<ChatMarkdown text={"- Parent\n  1. First\n  2. Second\n  - Caveat"} />,
		);

		const parent = container.querySelector("ul > li");
		const ordered = parent?.querySelector(":scope > ol");
		const bullets = parent?.querySelector(":scope > ul");
		expect(ordered?.querySelectorAll("li")).toHaveLength(2);
		expect(bullets?.querySelectorAll("li")).toHaveLength(1);
		expect(bullets?.textContent).toBe("Caveat");
	});

	it("keeps balanced parentheses inside a link destination", () => {
		render(
			<ChatMarkdown text="See [cache](https://en.wikipedia.org/wiki/Cache_(computing))." />,
		);

		expect(
			screen.getByRole("link", { name: "cache" }).getAttribute("href"),
		).toBe("https://en.wikipedia.org/wiki/Cache_(computing)");
	});

	it("shows markup in a reply as text instead of rendering it", () => {
		const { container } = render(
			<ChatMarkdown text={'<img src=x onerror="alert(1)"> **hi**'} />,
		);

		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
	});
});
