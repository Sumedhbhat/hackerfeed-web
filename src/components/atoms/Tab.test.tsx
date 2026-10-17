import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tab } from "./Tab";

describe("Tab", () => {
	it("renders a non-submitting button and passes ARIA state through", () => {
		render(
			<Tab role="tab" aria-selected={true}>
				Stories
			</Tab>,
		);
		const tab = screen.getByRole("tab", { name: "Stories" });
		expect(tab.getAttribute("type")).toBe("button");
		expect(tab.getAttribute("aria-selected")).toBe("true");
	});
});
