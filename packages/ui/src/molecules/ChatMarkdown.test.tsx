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

	it("shows markup in a reply as text instead of rendering it", () => {
		const { container } = render(
			<ChatMarkdown text={'<img src=x onerror="alert(1)"> **hi**'} />,
		);

		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
	});
});
