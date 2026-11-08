import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ToggleLabel } from "./ToggleLabel";

afterEach(cleanup);

function visibleWord() {
	const words = ["Save", "Saved"].map((word) =>
		screen.getByText(word, { exact: true }),
	);
	const shown = words.filter((el) => !el.className.includes("invisible"));
	expect(shown).toHaveLength(1);
	return shown[0]?.textContent;
}

describe("ToggleLabel", () => {
	it("shows the off word until pressed, then the on word", () => {
		const { rerender } = render(
			<ToggleLabel on={false} offLabel="Save" onLabel="Saved" />,
		);
		expect(visibleWord()).toBe("Save");

		rerender(<ToggleLabel on offLabel="Save" onLabel="Saved" />);
		expect(visibleWord()).toBe("Saved");

		rerender(<ToggleLabel on={false} offLabel="Save" onLabel="Saved" />);
		expect(visibleWord()).toBe("Save");
	});
});
